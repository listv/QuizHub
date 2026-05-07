using FluentValidation;
using QuizHub.DTOs;

namespace QuizHub.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Login).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(100);
    }
}

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Login).NotEmpty().MaximumLength(50)
            .Matches("^[a-zA-Z0-9._-]+$").WithMessage("Логін може містити лише латинські букви, цифри, '.', '_', '-'");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(4).MaximumLength(100);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Role).NotEmpty().Must(r => r is "Admin" or "Manager" or "Employee")
            .WithMessage("Роль має бути: Admin, Manager або Employee");
        RuleFor(x => x.Department).NotEmpty().MaximumLength(100);
    }
}

public class CreateQuestionRequestValidator : AbstractValidator<CreateQuestionRequest>
{
    public CreateQuestionRequestValidator()
    {
        RuleFor(x => x.Text).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Type).NotEmpty().Must(t => t is "Single" or "Multi" or "Open")
            .WithMessage("Тип має бути: Single, Multi або Open");
        RuleFor(x => x.Category).MaximumLength(100);

        // Single/Multi повинні мати мінімум 2 варіанти
        When(x => x.Type is "Single" or "Multi", () =>
        {
            RuleFor(x => x.Options).NotNull()
                .Must(o => o != null && o.Count >= 2)
                .WithMessage("Потрібно мінімум 2 варіанти відповіді");

            // Single повинен мати рівно 1 правильний
            When(x => x.Type == "Single", () =>
            {
                RuleFor(x => x.Options)
                    .Must(o => o != null && o.Count(opt => opt.IsCorrect) == 1)
                    .WithMessage("Потрібно рівно 1 правильна відповідь для типу Single");
            });

            // Multi повинен мати хоча б 1 правильний
            When(x => x.Type == "Multi", () =>
            {
                RuleFor(x => x.Options)
                    .Must(o => o != null && o.Any(opt => opt.IsCorrect))
                    .WithMessage("Потрібно хоча б 1 правильна відповідь для типу Multi");
            });

            RuleForEach(x => x.Options).ChildRules(opt =>
            {
                opt.RuleFor(o => o.Text).NotEmpty().MaximumLength(500);
            });
        });
    }
}

public class CreateTestRequestValidator : AbstractValidator<CreateTestRequest>
{
    public CreateTestRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TimeLimitMinutes).GreaterThanOrEqualTo(0).LessThanOrEqualTo(480);
        RuleFor(x => x.PassingScore).InclusiveBetween(1, 100);
        RuleFor(x => x.QuestionIds).NotEmpty()
            .WithMessage("Тест повинен містити хоча б 1 питання");
        RuleFor(x => x.MaxAttempts).GreaterThanOrEqualTo(0);
    }
}

public class SubmitTestRequestValidator : AbstractValidator<SubmitTestRequest>
{
    public SubmitTestRequestValidator()
    {
        RuleFor(x => x.TestId).NotEmpty();
        RuleFor(x => x.Answers).NotNull();
    }
}

public class UpdateQuestionRequestValidator : AbstractValidator<UpdateQuestionRequest>
{
    public UpdateQuestionRequestValidator()
    {
        When(x => x.Options != null && x.Type == "Single", () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o != null && o.Count(opt => opt.IsCorrect) == 1)
                .WithMessage("Потрібно рівно 1 правильна відповідь для типу Single");
        });

        When(x => x.Options != null && x.Type == "Multi", () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o != null && o.Any(opt => opt.IsCorrect))
                .WithMessage("Потрібно хоча б 1 правильна відповідь для типу Multi");
        });
    }
}