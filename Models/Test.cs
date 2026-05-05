using System.ComponentModel.DataAnnotations;

namespace QuizHub.Models;

public class Test
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int TimeLimitMinutes { get; set; } = 30;

    public int PassingScore { get; set; } = 70;

    public bool RandomizeQuestions { get; set; } = true;

    /// <summary>Max number of attempts per user. 0 = unlimited.</summary>
    public int MaxAttempts { get; set; } = 0;

    /// <summary>Deadline for taking the test. Null = no deadline.</summary>
    public DateTime? Deadline { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
    public ICollection<TestResult> Results { get; set; } = new List<TestResult>();
    public ICollection<TestAssignment> Assignments { get; set; } = new List<TestAssignment>();
}

public class TestQuestion
{
    public Guid TestId { get; set; }
    public Guid QuestionId { get; set; }
    public int SortOrder { get; set; }

    // Navigation
    public Test Test { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
