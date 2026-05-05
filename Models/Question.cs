using System.ComponentModel.DataAnnotations;

namespace QuizHub.Models;

public enum QuestionType
{
    Single,
    Multi,
    Open
}

public class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public string Text { get; set; } = string.Empty;

    [Required]
    public QuestionType Type { get; set; } = QuestionType.Single;

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public string? Explanation { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
    public ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
}

public class QuestionOption
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid QuestionId { get; set; }

    [Required]
    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int SortOrder { get; set; }

    // Navigation
    public Question Question { get; set; } = null!;
}
