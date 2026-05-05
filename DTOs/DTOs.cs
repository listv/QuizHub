using QuizHub.Models;

namespace QuizHub.DTOs;

// ════════════════════════════════════
// AUTH
// ════════════════════════════════════
public record LoginRequest(string Login, string Password);

public record LoginResponse(string Token, UserDto User);

public record UserDto(
    Guid Id, string Login, string FullName,
    string Role, string Department, bool IsActive);

// ════════════════════════════════════
// USERS
// ════════════════════════════════════
public record CreateUserRequest(
    string Login, string Password, string FullName,
    string Role, string Department);

public record UpdateUserRequest(
    string? FullName, string? Password,
    string? Role, string? Department, bool? IsActive);

// ════════════════════════════════════
// QUESTIONS
// ════════════════════════════════════
public record QuestionOptionDto(Guid Id, string Text, bool IsCorrect, int SortOrder);

public record QuestionDto(
    Guid Id, string Text, string Type, string Category,
    string? Explanation, string? ImageUrl,
    List<QuestionOptionDto> Options, DateTime CreatedAt);

public record CreateQuestionRequest(
    string Text, string Type, string Category,
    string? Explanation, List<CreateOptionRequest> Options);

public record CreateOptionRequest(string Text, bool IsCorrect);

public record UpdateQuestionRequest(
    string? Text, string? Type, string? Category,
    string? Explanation, List<CreateOptionRequest>? Options);

// ════════════════════════════════════
// TESTS
// ════════════════════════════════════
public record TestDto(
    Guid Id, string Title, string? Description,
    int TimeLimitMinutes, int PassingScore,
    bool RandomizeQuestions, int MaxAttempts, DateTime? Deadline,
    bool IsActive,
    List<Guid> QuestionIds, int AttemptCount, int PassedCount,
    List<TestAssignmentDto> Assignments,
    DateTime CreatedAt);

public record CreateTestRequest(
    string Title, string? Description,
    int TimeLimitMinutes, int PassingScore,
    bool RandomizeQuestions, List<Guid> QuestionIds,
    int MaxAttempts = 0, DateTime? Deadline = null);

public record UpdateTestRequest(
    string? Title, string? Description,
    int? TimeLimitMinutes, int? PassingScore,
    bool? RandomizeQuestions, bool? IsActive,
    List<Guid>? QuestionIds,
    int? MaxAttempts, DateTime? Deadline);

// ── Test Assignments ──
public record TestAssignmentDto(Guid Id, Guid? UserId, string? UserName, string? Department);

public record AssignTestRequest(Guid TestId, List<Guid>? UserIds, List<string>? Departments);

public record UnassignTestRequest(List<Guid> AssignmentIds);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmPassword);

// ════════════════════════════════════
// TEST TAKING & RESULTS
// ════════════════════════════════════
public record SubmitTestRequest(
    Guid TestId, List<SubmitAnswerRequest> Answers);

public record SubmitAnswerRequest(
    Guid QuestionId, string? AnswerData);

public record TestResultDto(
    Guid Id, Guid TestId, string TestTitle,
    Guid UserId, string UserName,
    int Score, int TotalQuestions, int CorrectAnswers,
    int PassingScore, bool Passed,
    DateTime StartedAt, DateTime? CompletedAt,
    List<AnswerDto>? Answers);

public record AnswerDto(
    Guid QuestionId, string QuestionText, string QuestionType,
    string? AnswerData, bool IsCorrect,
    string? Explanation, string? ImageUrl,
    List<QuestionOptionDto>? Options);

// ════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════
public record OverviewAnalytics(
    int TotalAttempts, int Passed, int Failed,
    double AverageScore);

public record EmployeeAnalytics(
    Guid UserId, string FullName, string Department,
    int Attempts, double? AverageScore,
    int Passed, int Failed);

public record DifficultQuestion(
    Guid QuestionId, string Text, string Category,
    int TotalAttempts, int WrongAnswers, double ErrorRate);

public record OverdueTestDto(
    Guid TestId, string TestTitle, DateTime Deadline,
    List<OverdueEmployeeDto> Employees);

public record OverdueEmployeeDto(
    Guid UserId, string FullName, string Department,
    bool HasAttempt, int? Score, bool? Passed);
