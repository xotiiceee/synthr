-- Setup data for gcolegrove328@gmail.com
DO $$
DECLARE
    user_id TEXT := 'cmptc1u3n0028ipjx6olsrz2t';
BEGIN
    -- Insert accounts
    INSERT INTO "Account" (id, name, type, balance, "isDefault", "userId", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid()::text, 'Checking', 'CHECKING', 0, true, user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Savings', 'SAVINGS', 0, false, user_id, NOW(), NOW());

    -- Insert categories
    INSERT INTO "Category" (id, name, type, "userId", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid()::text, 'Salary', 'INCOME', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Freelance', 'INCOME', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Housing', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Utilities', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Groceries', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Transportation', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Dining Out', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Entertainment', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Healthcare', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Subscriptions', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Shopping', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Savings', 'EXPENSE', user_id, NOW(), NOW()),
        (gen_random_uuid()::text, 'Debt Payment', 'EXPENSE', user_id, NOW(), NOW());

    -- Insert savings advisor
    INSERT INTO "SavingsAdvisor" (id, "userId", "incomeFrequency", "targetRate", "fixedExpenses", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, user_id, 'MONTHLY', 0.20, 0, NOW(), NOW())
    ON CONFLICT ("userId") DO NOTHING;

    -- Mark setup complete
    UPDATE "User" SET "setupComplete" = true WHERE id = user_id;
END $$;
