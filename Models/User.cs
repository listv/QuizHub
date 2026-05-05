using System.ComponentModel.DataAnnotations;

namespace QuizHub.Models;

public enum UserRole
{
    Admin,
    Manager,
    Employee
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string Login { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; } = UserRole.Employee;

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<TestResult> TestResults { get; set; } = new List<TestResult>();
}
