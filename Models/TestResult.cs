using System.ComponentModel.DataAnnotations;

namespace QuizHub.Models;

public class TestResult
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TestId { get; set; }
    public Guid UserId { get; set; }

    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int PassingScore { get; set; }

    public bool Passed => Score >= PassingScore;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Test Test { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
}

public class Answer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TestResultId { get; set; }
    public Guid QuestionId { get; set; }

    /// <summary>JSON: index (single), array of indexes (multi), or text (open)</summary>
    public string? AnswerData { get; set; }

    public bool IsCorrect { get; set; }

    // ── Question snapshot (versioning) ──
    /// <summary>Question text at the moment of answering</summary>
    public string QuestionTextSnapshot { get; set; } = string.Empty;

    /// <summary>JSON snapshot of options at the moment of answering</summary>
    public string? OptionsSnapshot { get; set; }

    // Navigation
    public TestResult TestResult { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
