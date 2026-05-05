using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizHub.DTOs;
using QuizHub.Services;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("general")]
public class QuestionsController : ControllerBase
{
    private readonly QuestionService _svc;

    public QuestionsController(QuestionService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category, [FromQuery] string? type)
        => Ok(await _svc.GetAllAsync(category, type));

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
        => Ok(await _svc.GetCategoriesAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var q = await _svc.GetByIdAsync(id);
        return q == null ? NotFound() : Ok(q);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuestionRequest req)
    {
        try
        {
            var result = await _svc.CreateAsync(req);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateQuestionRequest req)
    {
        var result = await _svc.UpdateAsync(id, req);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => await _svc.DeleteAsync(id) ? NoContent() : NotFound();
}
