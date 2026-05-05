using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Models;
using System.Security.Claims;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class ResultsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResultsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Адмін — всі результати.
    /// Менеджер — результати свого відділу.
    /// Співробітник — тільки свої.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? userId,
        [FromQuery] Guid? testId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var role = GetRole();
        var currentId = GetUserId();
        var dept = GetDepartment();

        var query = _db.TestResults
            .Include(r => r.Test)
            .Include(r => r.User)
            .AsQueryable();

        // Фільтрація за роллю
        if (role == "Employee")
            query = query.Where(r => r.UserId == currentId);
        else if (role == "Manager")
            query = query.Where(r => r.User.Department == dept);

        // Додаткові фільтри
        if (userId.HasValue) query = query.Where(r => r.UserId == userId);
        if (testId.HasValue) query = query.Where(r => r.TestId == testId);

        var total = await query.CountAsync();

        var results = await query
            .OrderByDescending(r => r.CompletedAt ?? r.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new TestResultDto(
                r.Id, r.TestId, r.Test.Title,
                r.UserId, r.User.FullName,
                r.Score, r.TotalQuestions, r.CorrectAnswers,
                r.PassingScore, r.Score >= r.PassingScore,
                r.StartedAt, r.CompletedAt, null))
            .ToListAsync();

        return Ok(new { total, page, pageSize, results });
    }

    /// <summary>
    /// Деталі результату з відповідями.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var role = GetRole();
        var currentId = GetUserId();
        var dept = GetDepartment();

        var result = await _db.TestResults
            .Include(r => r.Test)
            .Include(r => r.User)
            .Include(r => r.Answers)
                .ThenInclude(a => a.Question)
                    .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (result == null) return NotFound();

        // Перевірка доступу
        if (role == "Employee" && result.UserId != currentId)
            return Forbid();
        if (role == "Manager" && result.User.Department != dept)
            return Forbid();

        var answers = result.Answers.Select(a =>
        {
            // Prefer snapshots (versioning) over current question data
            var questionText = !string.IsNullOrEmpty(a.QuestionTextSnapshot)
                ? a.QuestionTextSnapshot : a.Question.Text;

            List<QuestionOptionDto>? options = null;
            if (!string.IsNullOrEmpty(a.OptionsSnapshot))
            {
                try
                {
                    var snapshotOpts = System.Text.Json.JsonSerializer.Deserialize<List<SnapshotOption>>(a.OptionsSnapshot);
                    options = snapshotOpts?.Select((o, i) => new QuestionOptionDto(Guid.Empty, o.Text, o.IsCorrect, i)).ToList();
                }
                catch { }
            }
            options ??= a.Question.Options.OrderBy(o => o.SortOrder)
                .Select(o => new QuestionOptionDto(o.Id, o.Text, o.IsCorrect, o.SortOrder)).ToList();

            return new AnswerDto(
                a.QuestionId, questionText, a.Question.Type.ToString(),
                a.AnswerData, a.IsCorrect,
                a.IsCorrect ? null : a.Question.Explanation,
                a.Question.ImageUrl, options);
        }).ToList();

        return Ok(new TestResultDto(
            result.Id, result.TestId, result.Test.Title,
            result.UserId, result.User.FullName,
            result.Score, result.TotalQuestions, result.CorrectAnswers,
            result.PassingScore, result.Passed,
            result.StartedAt, result.CompletedAt, answers));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetRole() =>
        User.FindFirstValue(ClaimTypes.Role) ?? "Employee";

    private string GetDepartment() =>
        User.FindFirstValue("department") ?? "";
}

file record SnapshotOption(string Text, bool IsCorrect);
