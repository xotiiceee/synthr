-- Clean up duplicate data for gcolegrove328@gmail.com
DELETE FROM "Account" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'gcolegrove328@gmail.com');
DELETE FROM "Category" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'gcolegrove328@gmail.com');
DELETE FROM "SavingsAdvisor" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'gcolegrove328@gmail.com');

-- Re-insert fresh data
DO $$
DECLARE
    uid TEXT;
BEGIN
    SELECT id INTO uid FROM "User" WHERE email = 'gcolegrove328@gmail.com';

    INSERT INTO "Account" (id, name, type, balance, "isDefault", "userId", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid()::text, 'Checking', 'CHECKING', 0, true, uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Savings', 'SAVINGS', 0, false, uid, NOW(), NOW());

    INSERT INTO "Category" (id, name, type, "userId", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid()::text, 'Salary', 'INCOME', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Freelance', 'INCOME', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Housing', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Utilities', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Groceries', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Transportation', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Dining Out', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Entertainment', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Healthcare', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Subscriptions', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Shopping', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Savings', 'EXPENSE', uid, NOW(), NOW()),
        (gen_random_uuid()::text, 'Debt Payment', 'EXPENSE', uid, NOW(), NOW());

    INSERT INTO "SavingsAdvisor" (id, "userId", "incomeFrequency", "targetRate", "fixedExpenses", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, uid, 'MONTHLY', 0.20, 0, NOW(), NOW());

    UPDATE "User" SET "setupComplete" = true WHERE id = uid;
END $$;

-- Verify cleanup
SELECT count(*) as accounts FROM "Account";
SELECT count(*) as categories FROM "Category";
