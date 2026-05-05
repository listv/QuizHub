using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Models;
using System.Text.Json;

namespace QuizHub.Services;

public class TestService
{
    private readonly AppDbContext _db;
    private readonly ILogger<TestService> _log;

    public TestService(AppDbContext db, ILogger<TestService> log)
    {
        _db = db;
        _log = log;
    }

    public async Task<List<TestDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.Tests
            .Include(t => t.TestQuestions)
            .Include(t => t.Results)
            .Include(t => t.Assignments).ThenInclude(a => a.User)
            .AsQueryable();
        if (!includeInactive) query = query.Where(t => t.IsActive);

        return await query.OrderByDescending(t => t.CreatedAt)
            .Select(t => new TestDto(
                t.Id, t.Title, t.Description, t.TimeLimitMinutes, t.PassingScore,
                t.RandomizeQuestions, t.MaxAttempts, t.Deadline, t.IsActive,
                t.TestQuestions.OrderBy(tq => tq.SortOrder).Select(tq => tq.QuestionId).ToList(),
                t.Results.Count, t.Results.Count(r => r.Score >= t.PassingScore),
                t.Assignments.Select(a => new TestAssignmentDto(
                    a.Id, a.UserId, a.User != null ? a.User.FullName : null, a.Department)).ToList(),
                t.CreatedAt))
            .ToListAsync();
    }

    public async Task<TestResultDto> SubmitAsync(Guid userId, SubmitTestRequest req)
    {
        var test = await _db.Tests
            .Include(t => t.TestQuestions).ThenInclude(tq => tq.Question).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(t => t.Id == req.TestId);

        if (test == null)
            throw new KeyNotFoundException("Тест не знайдено");

        if (!test.IsActive)
            throw new InvalidOperationException("Тест неактивний");

        // Check deadline
        if (test.Deadline.HasValue && DateTime.UtcNow > test.Deadline.Value)
            throw new InvalidOperationException($"Дедлайн тесту минув ({test.Deadline.Value:dd.MM.yyyy})");

        // Check max attempts
        if (test.MaxAttempts > 0)
        {
            var attempts = await _db.TestResults.CountAsync(r => r.TestId == test.Id && r.UserId == userId);
            if (attempts >= test.MaxAttempts)
                throw new InvalidOperationException($"Досягнуто максимальну кількість спроб ({test.MaxAttempts})");
        }

        var result = new TestResult
        {
            TestId = test.Id,
            UserId = userId,
            PassingScore = test.PassingScore,
            CompletedAt = DateTime.UtcNow
        };

        int correct = 0;
        int total = test.TestQuestions.Count;

        foreach (var tq in test.TestQuestions)
        {
            var q = tq.Question;
            var submitted = req.Answers.FirstOrDefault(a => a.QuestionId == q.Id);
            bool isCorrect = false;

            if (submitted != null && q.Type != QuestionType.Open)
            {
                if (q.Type == QuestionType.Single)
                {
                    if (int.TryParse(submitted.AnswerData, out var idx))
                    {
                        var sorted = q.Options.OrderBy(o => o.SortOrder).ToList();
                        isCorrect = idx >= 0 && idx < sorted.Count && sorted[idx].IsCorrect;
                    }
                }
                else if (q.Type == QuestionType.Multi)
                {
                    try
                    {
                        var selected = JsonSerializer.Deserialize<List<int>>(submitted.AnswerData ?? "[]") ?? new();
                        var sorted = q.Options.OrderBy(o => o.SortOrder).ToList();
                        var correctIdxs = sorted.Select((o, i) => o.IsCorrect ? i : -1).Where(i => i >= 0).ToList();
                        isCorrect = correctIdxs.Count == selected.Count && correctIdxs.All(selected.Contains);
                    }
                    catch { }
                }
            }

            if (isCorrect) correct++;

            // Snapshot question text and options for versioning
            var optionsSnapshot = q.Type != QuestionType.Open
                ? JsonSerializer.Serialize(q.Options.OrderBy(o => o.SortOrder).Select(o => new { o.Text, o.IsCorrect }))
                : null;

            result.Answers.Add(new Answer
            {
                QuestionId = q.Id,
                AnswerData = submitted?.AnswerData,
                IsCorrect = isCorrect,
                QuestionTextSnapshot = q.Text,
                OptionsSnapshot = optionsSnapshot
            });
        }

        result.TotalQuestions = total;
        result.CorrectAnswers = correct;
        result.Score = total > 0 ? (int)Math.Round((double)correct / total * 100) : 0;

        _db.TestResults.Add(result);
        await _db.SaveChangesAsync();

        _log.LogInformation("Test submitted: User={UserId}, Test='{Title}', Score={Score}%, Passed={Passed}",
            userId, test.Title, result.Score, result.Passed);

        return new TestResultDto(result.Id, result.TestId, test.Title, result.UserId, "",
            result.Score, result.TotalQuestions, result.CorrectAnswers,
            result.PassingScore, result.Passed, result.StartedAt, result.CompletedAt, null);
    }
}
