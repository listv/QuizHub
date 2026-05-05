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
[Authorize(Roles = "Admin,Manager")]
[EnableRateLimiting("general")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Загальна статистика.
    /// Менеджер бачить тільки свій відділ.
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var query = GetFilteredResults();

        var results = await query.ToListAsync();
        var total = results.Count;
        var passed = results.Count(r => r.Score >= r.PassingScore);
        var avg = total > 0 ? results.Average(r => r.Score) : 0;

        return Ok(new OverviewAnalytics(total, passed, total - passed, Math.Round(avg, 1)));
    }

    /// <summary>
    /// Статистика по кожному співробітнику.
    /// </summary>
    [HttpGet("employees")]
    public async Task<IActionResult> EmployeeStats()
    {
        var role = GetRole();
        var dept = GetDepartment();

        var empQuery = _db.Users.Where(u => u.Role == UserRole.Employee && u.IsActive);
        if (role == "Manager")
            empQuery = empQuery.Where(u => u.Department == dept);

        var employees = await empQuery
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Department,
                Results = u.TestResults.ToList()
            })
            .ToListAsync();

        var stats = employees.Select(e =>
        {
            var attempts = e.Results.Count;
            var avg = attempts > 0 ? (double?)Math.Round(e.Results.Average(r => r.Score), 1) : null;
            var passed = e.Results.Count(r => r.Score >= r.PassingScore);
            return new EmployeeAnalytics(
                e.Id, e.FullName, e.Department,
                attempts, avg, passed, attempts - passed);
        })
        .OrderByDescending(e => e.AverageScore ?? 0)
        .ToList();

        return Ok(stats);
    }

    /// <summary>
    /// Питання з найвищою частотою помилок.
    /// </summary>
    [HttpGet("difficult-questions")]
    public async Task<IActionResult> DifficultQuestions([FromQuery] int top = 15)
    {
        var query = GetFilteredResults();
        var resultIds = await query.Select(r => r.Id).ToListAsync();

        var answers = await _db.Answers
            .Where(a => resultIds.Contains(a.TestResultId))
            .GroupBy(a => a.QuestionId)
            .Select(g => new
            {
                QuestionId = g.Key,
                Total = g.Count(),
                Wrong = g.Count(a => !a.IsCorrect)
            })
            .Where(x => x.Total >= 2) // мінімум 2 спроби
            .OrderByDescending(x => (double)x.Wrong / x.Total)
            .Take(top)
            .ToListAsync();

        var qIds = answers.Select(a => a.QuestionId).ToList();
        var questions = await _db.Questions
            .Where(q => qIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        var result = answers
            .Where(a => questions.ContainsKey(a.QuestionId))
            .Select(a =>
            {
                var q = questions[a.QuestionId];
                return new DifficultQuestion(
                    q.Id, q.Text, q.Category,
                    a.Total, a.Wrong,
                    Math.Round((double)a.Wrong / a.Total * 100, 1));
            })
            .ToList();

        return Ok(result);
    }

    /// <summary>
    /// Детальна статистика одного співробітника.
    /// </summary>
    [HttpGet("employees/{userId:guid}")]
    public async Task<IActionResult> EmployeeDetail(Guid userId)
    {
        var role = GetRole();
        var dept = GetDepartment();

        var user = await _db.Users
            .Include(u => u.TestResults)
                .ThenInclude(r => r.Test)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();
        if (role == "Manager" && user.Department != dept) return Forbid();

        var results = user.TestResults
            .OrderByDescending(r => r.CompletedAt ?? r.StartedAt)
            .Select(r => new TestResultDto(
                r.Id, r.TestId, r.Test.Title,
                r.UserId, user.FullName,
                r.Score, r.TotalQuestions, r.CorrectAnswers,
                r.PassingScore, r.Passed,
                r.StartedAt, r.CompletedAt, null))
            .ToList();

        // Складні питання цього співробітника
        var resultIds = user.TestResults.Select(r => r.Id).ToList();
        var wrongAnswers = await _db.Answers
            .Include(a => a.Question)
            .Where(a => resultIds.Contains(a.TestResultId) && !a.IsCorrect)
            .GroupBy(a => a.QuestionId)
            .Select(g => new
            {
                QuestionId = g.Key,
                Text = g.First().Question.Text,
                Category = g.First().Question.Category,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            User = new UserDto(user.Id, user.Login, user.FullName,
                user.Role.ToString(), user.Department, user.IsActive),
            Results = results,
            DifficultQuestions = wrongAnswers
        });
    }

    /// <summary>
    /// Тести з простроченим дедлайном та списком співробітників, що не пройшли вчасно.
    /// </summary>
    [HttpGet("overdue")]
    public async Task<IActionResult> OverdueTests()
    {
        var role = GetRole();
        var dept = GetDepartment();

        // Tests with deadlines that have passed
        var tests = await _db.Tests
            .Where(t => t.Deadline.HasValue && t.Deadline.Value < DateTime.UtcNow && t.IsActive)
            .OrderByDescending(t => t.Deadline)
            .ToListAsync();

        // All active employees (filtered by dept for managers)
        var employees = await _db.Users
            .Where(u => u.Role == UserRole.Employee && u.IsActive)
            .Where(u => role != "Manager" || u.Department == dept)
            .ToListAsync();

        var results = new List<OverdueTestDto>();

        foreach (var test in tests)
        {
            var testResults = await _db.TestResults
                .Where(r => r.TestId == test.Id && r.CompletedAt.HasValue && r.CompletedAt <= test.Deadline)
                .ToListAsync();

            var overdueEmployees = new List<OverdueEmployeeDto>();

            foreach (var emp in employees)
            {
                var empResult = testResults.FirstOrDefault(r => r.UserId == emp.Id);
                if (empResult == null)
                {
                    // Not passed at all before deadline
                    overdueEmployees.Add(new OverdueEmployeeDto(
                        emp.Id, emp.FullName, emp.Department, false, null, null));
                }
            }

            if (overdueEmployees.Count > 0)
            {
                results.Add(new OverdueTestDto(
                    test.Id, test.Title, test.Deadline!.Value,
                    overdueEmployees.OrderBy(e => e.FullName).ToList()));
            }
        }

        return Ok(results);
    }

    private IQueryable<TestResult> GetFilteredResults()
    {
        var role = GetRole();
        var dept = GetDepartment();

        var query = _db.TestResults
            .Include(r => r.User)
            .AsQueryable();

        if (role == "Manager")
            query = query.Where(r => r.User.Department == dept);

        return query;
    }

    private string GetRole() =>
        User.FindFirstValue(ClaimTypes.Role) ?? "Employee";

    private string GetDepartment() =>
        User.FindFirstValue("department") ?? "";
}
