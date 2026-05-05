using System.ComponentModel.DataAnnotations;

namespace QuizHub.Models;

public class TestAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TestId { get; set; }

    /// <summary>Specific user. Null if assigned to department.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Department name. Null if assigned to specific user.</summary>
    [MaxLength(100)]
    public string? Department { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Test Test { get; set; } = null!;
    public User? User { get; set; }
}
