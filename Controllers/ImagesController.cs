using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuizHub.Data;

namespace QuizHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("general")]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ImagesController> _log;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".gif", ".webp" };

    private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

    public ImagesController(AppDbContext db, IWebHostEnvironment env, ILogger<ImagesController> log)
    {
        _db = db;
        _env = env;
        _log = log;
    }

    /// <summary>
    /// Завантажити зображення до питання.
    /// </summary>
    [HttpPost("questions/{questionId:guid}")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> UploadQuestionImage(Guid questionId, IFormFile file)
    {
        var question = await _db.Questions.FindAsync(questionId);
        if (question == null) return NotFound(new { message = "Питання не знайдено" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Файл не завантажено" });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Файл занадто великий. Максимум 5 МБ" });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"Непідтримуваний формат. Дозволені: {string.Join(", ", AllowedExtensions)}" });

        // Delete old image if exists
        if (!string.IsNullOrEmpty(question.ImageUrl))
        {
            var oldPath = GetFilePath(question.ImageUrl);
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        // Save new image
        var fileName = $"{questionId}{ext}";
        var uploadsDir = GetUploadsDir();
        Directory.CreateDirectory(uploadsDir);
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        // Update question
        question.ImageUrl = $"/api/images/{fileName}";
        question.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _log.LogInformation("Image uploaded for question {QuestionId}: {FileName}", questionId, fileName);

        return Ok(new { imageUrl = question.ImageUrl });
    }

    /// <summary>
    /// Видалити зображення з питання.
    /// </summary>
    [HttpDelete("questions/{questionId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteQuestionImage(Guid questionId)
    {
        var question = await _db.Questions.FindAsync(questionId);
        if (question == null) return NotFound();

        if (!string.IsNullOrEmpty(question.ImageUrl))
        {
            var filePath = GetFilePath(question.ImageUrl);
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);

            question.ImageUrl = null;
            question.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    /// <summary>
    /// Отримати зображення за ім'ям файлу (авторизація через JWT).
    /// </summary>
    [HttpGet("{fileName}")]
    [Authorize]
    public IActionResult GetImage(string fileName)
    {
        // Prevent path traversal
        if (fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\'))
            return BadRequest();

        var filePath = Path.Combine(GetUploadsDir(), fileName);
        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        return PhysicalFile(filePath, contentType);
    }

    private string GetUploadsDir() => Path.Combine(
        _env.ContentRootPath, "uploads", "images");

    private string GetFilePath(string imageUrl) => Path.Combine(
        GetUploadsDir(), Path.GetFileName(imageUrl));
}
