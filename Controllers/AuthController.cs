using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Services;
using System.Security.Claims;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("general")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;
    private readonly ILogger<AuthController> _log;

    public AuthController(AppDbContext db, AuthService auth, ILogger<AuthController> log)
    {
        _db = db;
        _auth = auth;
        _log = log;
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Login == req.Login && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            _log.LogWarning("Failed login attempt for '{Login}' from {IP}",
                req.Login, HttpContext.Connection.RemoteIpAddress);
            return Unauthorized(new { message = "Невірний логін або пароль" });
        }

        var token = _auth.GenerateToken(user);
        var dto = MapUser(user);

        _log.LogInformation("User '{Login}' logged in ({Role})", user.Login, user.Role);
        return Ok(new LoginResponse(token, dto));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(MapUser(user));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        if (req.NewPassword != req.ConfirmPassword)
            return BadRequest(new { message = "Паролі не співпадають" });

        if (req.NewPassword.Length < 4)
            return BadRequest(new { message = "Новий пароль має бути мінімум 4 символи" });

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
        {
            _log.LogWarning("Failed password change attempt for '{Login}'", user.Login);
            return BadRequest(new { message = "Поточний пароль невірний" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        _log.LogInformation("User '{Login}' changed password", user.Login);
        return Ok(new { message = "Пароль успішно змінено" });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static UserDto MapUser(Models.User u) =>
        new(u.Id, u.Login, u.FullName, u.Role.ToString(), u.Department, u.IsActive);
}
