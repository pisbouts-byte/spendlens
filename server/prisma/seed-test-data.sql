-- Test data for SpendLens Phase 5+6 testing
-- User: 5e429171-6293-4170-8700-d7f8d3d5713e (demo@spendlens.dev)

-- Category IDs:
-- Groceries:      949ddb24-ac6a-4805-a813-4509c54aa0a1
-- Dining:         8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06
-- Transportation: 822ae6e7-eebe-4e05-a04d-3ad1eebdf641
-- Housing:        d30c951b-6de6-464b-987f-853b2224a9a4
-- Utilities:      7da8e6b3-f2e4-42cd-94bb-6b34ff0bafdb
-- Entertainment:  b967090c-80bf-4f50-be84-485ce61a8b91
-- Shopping:       4dd3ca6b-3bf0-44a7-b6a8-0b77eee9dc0e
-- Subscriptions:  27ad42f4-cc7e-44ce-81ae-f4fc7db6c57c
-- Income:         7d120afd-78b0-4102-bacd-573cc65b4cd2

-- Insert transactions (March 2026, mix of categorized and uncategorized)
INSERT INTO "Transaction" (id, "userId", "categoryId", amount, "merchantName", "originalName", date, "originalCategory", "isExcluded", "isPending", "createdAt", "updatedAt") VALUES
-- Week 1 (Mar 1-7)
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 87.32, 'Whole Foods', 'WHOLE FOODS MARKET #10234', '2026-03-01', 'Groceries', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 34.50, 'Chipotle', 'CHIPOTLE ONLINE ORD', '2026-03-01', 'Restaurants', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '822ae6e7-eebe-4e05-a04d-3ad1eebdf641', 45.00, 'Shell Gas', 'SHELL OIL 57442', '2026-03-02', 'Gas Stations', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', 'd30c951b-6de6-464b-987f-853b2224a9a4', 1850.00, 'Rent', 'ACH PAYMENT RENT MAR', '2026-03-01', 'Rent', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 12.99, 'Netflix', 'NETFLIX.COM', '2026-03-03', 'Digital Services', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '7da8e6b3-f2e4-42cd-94bb-6b34ff0bafdb', 142.30, 'Electric Company', 'PG&E ELECTRIC BILL', '2026-03-03', 'Utilities', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 53.21, 'Trader Joe''s', 'TRADER JOE''S #421', '2026-03-04', 'Groceries', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 29.99, 'Amazon', 'AMZN Mktp US*2K4L9', '2026-03-05', 'Shopping', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '7d120afd-78b0-4102-bacd-573cc65b4cd2', -3200.00, 'Payroll', 'GUSTO PAYROLL DIR DEP', '2026-03-05', 'Income', true, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', 'b967090c-80bf-4f50-be84-485ce61a8b91', 15.99, 'Spotify', 'SPOTIFY USA', '2026-03-06', 'Subscriptions', false, false, NOW(), NOW()),

-- Week 2 (Mar 8-14)
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 62.40, 'Olive Garden', 'OLIVE GARDEN #1823', '2026-03-08', 'Restaurants', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 112.87, 'Costco', 'COSTCO WHSE #1234', '2026-03-09', 'Groceries', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 8.50, 'Starbucks', 'STARBUCKS STORE 12345', '2026-03-10', 'Coffee Shops', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '822ae6e7-eebe-4e05-a04d-3ad1eebdf641', 38.00, 'Uber', 'UBER *TRIP', '2026-03-10', 'Ride Share', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 49.99, 'Target', 'TARGET 00012345', '2026-03-11', 'Shopping', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '4dd3ca6b-3bf0-44a7-b6a8-0b77eee9dc0e', 189.00, 'Nike', 'NIKE.COM', '2026-03-12', 'Shopping', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 18.75, 'Panda Express', 'PANDA EXPRESS #938', '2026-03-13', 'Restaurants', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '7da8e6b3-f2e4-42cd-94bb-6b34ff0bafdb', 65.00, 'Water Company', 'CITY WATER BILL', '2026-03-13', 'Utilities', false, false, NOW(), NOW()),

-- Week 3 (Mar 15-21)
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 67.43, 'Whole Foods', 'WHOLE FOODS MARKET #10234', '2026-03-15', 'Groceries', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 24.99, 'Hulu', 'HULU *SUBSCRIPTION', '2026-03-15', 'Digital Services', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '822ae6e7-eebe-4e05-a04d-3ad1eebdf641', 52.00, 'Shell Gas', 'SHELL OIL 57442', '2026-03-16', 'Gas Stations', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', 'b967090c-80bf-4f50-be84-485ce61a8b91', 65.00, 'AMC Theaters', 'AMC THEATERS #2918', '2026-03-17', 'Entertainment', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 42.80, 'DoorDash', 'DOORDASH DASHER', '2026-03-18', 'Restaurants', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '7d120afd-78b0-4102-bacd-573cc65b4cd2', -3200.00, 'Payroll', 'GUSTO PAYROLL DIR DEP', '2026-03-19', 'Income', true, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 150.00, 'Amazon', 'AMZN Mktp US*8R2M1', '2026-03-19', 'Shopping', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 45.60, 'Trader Joe''s', 'TRADER JOE''S #421', '2026-03-20', 'Groceries', false, false, NOW(), NOW()),

-- Week 4 (Mar 22-25, current week)
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 28.50, 'Chipotle', 'CHIPOTLE ONLINE ORD', '2026-03-22', 'Restaurants', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 95.12, 'Costco', 'COSTCO WHSE #1234', '2026-03-23', 'Groceries', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 6.75, 'Starbucks', 'STARBUCKS STORE 12345', '2026-03-24', 'Coffee Shops', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '822ae6e7-eebe-4e05-a04d-3ad1eebdf641', 41.00, 'Uber', 'UBER *TRIP', '2026-03-24', 'Ride Share', false, false, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '4dd3ca6b-3bf0-44a7-b6a8-0b77eee9dc0e', 32.99, 'Amazon', 'AMZN Mktp US*5T7N3', '2026-03-25', 'Shopping', false, true, NOW(), NOW());

-- Insert budgets
INSERT INTO "Budget" (id, "userId", "categoryId", type, amount, "isActive", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 'MONTHLY', 400.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 'MONTHLY', 200.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', 'b967090c-80bf-4f50-be84-485ce61a8b91', 'MONTHLY', 100.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '4dd3ca6b-3bf0-44a7-b6a8-0b77eee9dc0e', 'MONTHLY', 150.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', NULL, 'MONTHLY', 3500.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '949ddb24-ac6a-4805-a813-4509c54aa0a1', 'WEEKLY', 100.00, true, NOW(), NOW()),
(gen_random_uuid(), '5e429171-6293-4170-8700-d7f8d3d5713e', '8aec5e83-f50a-42d0-90b7-7a3b6c1d3b06', 'WEEKLY', 50.00, true, NOW(), NOW());
