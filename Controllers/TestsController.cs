using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Models;
using QuizHub.Services;
using System.Security.Claims;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class TestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TestService _testSvc;

    public TestsController(AppDbContext db, TestService testSvc)
    {
        _db = db;
        _testSvc = testSvc;
    }

    /// <summary>
    /// Admin — all tests. Manager — active tests. Employee — assigned tests only.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var role = GetRole();

        if (role == "Employee")
        {
            var userId = GetUserId();
            var dept = GetDepartment();

            var tests = await _db.Tests
                .Include(t => t.TestQuestions)
                .Include(t => t.Results)
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .Where(t => t.IsActive &&
                    t.Assignments.Any(a => a.UserId == userId || a.Department == dept))
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TestDto(
                    t.Id, t.Title, t.Description, t.TimeLimitMinutes, t.PassingScore,
                    t.RandomizeQuestions, t.MaxAttempts, t.Deadline, t.IsActive,
                    t.TestQuestions.OrderBy(tq => tq.SortOrder).Select(tq => tq.QuestionId).ToList(),
                    t.Results.Count, t.Results.Count(r => r.Score >= t.PassingScore),
                    t.Assignments.Select(a => new TestAssignmentDto(
                        a.Id, a.UserId, a.User != null ? a.User.FullName : null, a.Department)).ToList(),
                    t.CreatedAt))
                .ToListAsync();

            return Ok(tests);
        }

        // Admin sees all (including inactive), Manager sees active only
        var includeInactive = role == "Admin";
        return Ok(await _testSvc.GetAllAsync(includeInactive));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var test = await _db.Tests
            .Include(t => t.TestQuestions).Include(t => t.Results)
            .Include(t => t.Assignments).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) return NotFound();

        return Ok(new TestDto(
            test.Id, test.Title, test.Description, test.TimeLimitMinutes, test.PassingScore,
            test.RandomizeQuestions, test.MaxAttempts, test.Deadline, test.IsActive,
            test.TestQuestions.OrderBy(tq => tq.SortOrder).Select(tq => tq.QuestionId).ToList(),
            test.Results.Count, test.Results.Count(r => r.Score >= test.PassingScore),
            test.Assignments.Select(a => new TestAssignmentDto(
                a.Id, a.UserId, a.User != null ? a.User.FullName : null, a.Department)).ToList(),
            test.CreatedAt));
    }

    [HttpGet("{id:guid}/questions")]
    public async Task<IActionResult> GetTestQuestions(Guid id)
    {
        var test = await _db.Tests
            .Include(t => t.TestQuestions).ThenInclude(tq => tq.Question).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) return NotFound();

        var questions = test.TestQuestions.OrderBy(tq => tq.SortOrder).Select(tq => new
        {
            tq.Question.Id,
            tq.Question.Text,
            Type = tq.Question.Type.ToString(),
            tq.Question.ImageUrl,
            Options = tq.Question.Type != QuestionType.Open
                ? tq.Question.Options.OrderBy(o => o.SortOrder).Select(o => new { o.Id, o.Text }).ToList()
                : null
        }).ToList();

        if (test.RandomizeQuestions)
        {
            var rng = new Random();
            return Ok(new
            {
                test.Id,
                test.Title,
                test.Description,
                test.TimeLimitMinutes,
                test.PassingScore,
                Questions = questions.OrderBy(_ => rng.Next()).ToList()
            });
        }
        return Ok(new { test.Id, test.Title, test.Description, test.TimeLimitMinutes, test.PassingScore, Questions = questions });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTestRequest req)
    {
        var test = new Test
        {
            Title = req.Title,
            Description = req.Description,
            TimeLimitMinutes = req.TimeLimitMinutes,
            PassingScore = req.PassingScore,
            RandomizeQuestions = req.RandomizeQuestions,
            MaxAttempts = req.MaxAttempts,
            Deadline = req.Deadline
        };
        for (int i = 0; i < req.QuestionIds.Count; i++)
            test.TestQuestions.Add(new TestQuestion { QuestionId = req.QuestionIds[i], SortOrder = i });

        _db.Tests.Add(test);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = test.Id }, new { test.Id, test.Title });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTestRequest req)
    {
        var test = await _db.Tests.Include(t => t.TestQuestions).FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) return NotFound();

        if (req.Title != null) test.Title = req.Title;
        if (req.Description != null) test.Description = req.Description;
        if (req.TimeLimitMinutes.HasValue) test.TimeLimitMinutes = req.TimeLimitMinutes.Value;
        if (req.PassingScore.HasValue) test.PassingScore = req.PassingScore.Value;
        if (req.RandomizeQuestions.HasValue) test.RandomizeQuestions = req.RandomizeQuestions.Value;
        if (req.IsActive.HasValue) test.IsActive = req.IsActive.Value;
        if (req.MaxAttempts.HasValue) test.MaxAttempts = req.MaxAttempts.Value;
        if (req.Deadline.HasValue) test.Deadline = req.Deadline.Value;

        if (req.QuestionIds != null)
        {
            _db.TestQuestions.RemoveRange(test.TestQuestions);
            test.TestQuestions.Clear();
            for (int i = 0; i < req.QuestionIds.Count; i++)
                test.TestQuestions.Add(new TestQuestion { QuestionId = req.QuestionIds[i], SortOrder = i });
        }

        test.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { test.Id, test.Title });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var test = await _db.Tests.FindAsync(id);
        if (test == null) return NotFound();
        test.IsActive = false;
        test.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Відновити деактивований тест.</summary>
    [HttpPost("{id:guid}/restore")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var test = await _db.Tests.FindAsync(id);
        if (test == null) return NotFound();
        test.IsActive = true;
        test.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { test.Id, test.Title });
    }

    /// <summary>Створити дублікат тесту без результатів.</summary>
    [HttpPost("{id:guid}/duplicate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Duplicate(Guid id)
    {
        var source = await _db.Tests
            .Include(t => t.TestQuestions)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (source == null) return NotFound();

        var copy = new Test
        {
            Title = $"{source.Title} (копія)",
            Description = source.Description,
            TimeLimitMinutes = source.TimeLimitMinutes,
            PassingScore = source.PassingScore,
            RandomizeQuestions = source.RandomizeQuestions,
            MaxAttempts = source.MaxAttempts,
            Deadline = null, // скидаємо дедлайн
            IsActive = true
        };

        foreach (var tq in source.TestQuestions.OrderBy(q => q.SortOrder))
            copy.TestQuestions.Add(new TestQuestion { QuestionId = tq.QuestionId, SortOrder = tq.SortOrder });

        _db.Tests.Add(copy);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = copy.Id }, new { copy.Id, copy.Title });
    }

    /// <summary>
    /// Assign test to specific users and/or departments.
    /// </summary>
    [HttpPost("assign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Assign([FromBody] AssignTestRequest req)
    {
        var test = await _db.Tests.FindAsync(req.TestId);
        if (test == null) return NotFound(new { message = "Тест не знайдено" });

        var added = 0;

        if (req.UserIds != null)
        {
            foreach (var uid in req.UserIds)
            {
                if (!await _db.TestAssignments.AnyAsync(a => a.TestId == req.TestId && a.UserId == uid))
                {
                    _db.TestAssignments.Add(new TestAssignment { TestId = req.TestId, UserId = uid });
                    added++;
                }
            }
        }

        if (req.Departments != null)
        {
            foreach (var dept in req.Departments)
            {
                if (!await _db.TestAssignments.AnyAsync(a => a.TestId == req.TestId && a.Department == dept))
                {
                    _db.TestAssignments.Add(new TestAssignment { TestId = req.TestId, Department = dept });
                    added++;
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Призначено: {added}", testId = req.TestId });
    }

    /// <summary>
    /// Remove assignments.
    /// </summary>
    [HttpPost("unassign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Unassign([FromBody] UnassignTestRequest req)
    {
        var assignments = await _db.TestAssignments
            .Where(a => req.AssignmentIds.Contains(a.Id))
            .ToListAsync();

        _db.TestAssignments.RemoveRange(assignments);
        await _db.SaveChangesAsync();
        return Ok(new { removed = assignments.Count });
    }

    [HttpPost("submit")]
    [EnableRateLimiting("submit")]
    public async Task<IActionResult> Submit([FromBody] SubmitTestRequest req)
    {
        try
        {
            var result = await _testSvc.SubmitAsync(GetUserId(), req);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Get all departments (for assignment UI).</summary>
    [HttpGet("departments")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetDepartments()
    {
        var depts = await _db.Users
            .Where(u => u.IsActive && u.Department != "")
            .Select(u => u.Department).Distinct().OrderBy(d => d).ToListAsync();
        return Ok(depts);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetRole() => User.FindFirstValue(ClaimTypes.Role) ?? "Employee";
    private string GetDepartment() => User.FindFirstValue("department") ?? "";
}
