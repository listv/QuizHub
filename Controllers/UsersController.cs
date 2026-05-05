using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Models;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("general")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? department, [FromQuery] string? role)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(department))
            query = query.Where(u => u.Department == department);

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var r))
            query = query.Where(u => u.Role == r);

        var users = await query.OrderBy(u => u.FullName)
            .Select(u => new UserDto(u.Id, u.Login, u.FullName,
                u.Role.ToString(), u.Department, u.IsActive))
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(new UserDto(user.Id, user.Login, user.FullName,
            user.Role.ToString(), user.Department, user.IsActive));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Login == req.Login))
            return Conflict(new { message = "Логін вже зайнятий" });

        if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
            return BadRequest(new { message = "Невірна роль" });

        var user = new User
        {
            Login = req.Login,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FullName = req.FullName,
            Role = role,
            Department = req.Department
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id },
            new UserDto(user.Id, user.Login, user.FullName,
                user.Role.ToString(), user.Department, user.IsActive));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (req.FullName != null) user.FullName = req.FullName;
        if (req.Department != null) user.Department = req.Department;
        if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;
        if (req.Password != null)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        if (req.Role != null && Enum.TryParse<UserRole>(req.Role, true, out var role))
            user.Role = role;

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new UserDto(user.Id, user.Login, user.FullName,
            user.Role.ToString(), user.Department, user.IsActive));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        // Soft delete — деактивуємо
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
