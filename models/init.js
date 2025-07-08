import { execute } from '../config/db.js';

// Create sequence for categories if doesn't exist
const createCategorySequence = async () => {
  try {
    await execute(`
      DECLARE
        seq_exists NUMBER;
      BEGIN
        SELECT COUNT(*) INTO seq_exists
        FROM user_sequences
        WHERE sequence_name = 'CATEGORY_SEQ';
        
        IF seq_exists = 0 THEN
          EXECUTE IMMEDIATE 'CREATE SEQUENCE category_seq START WITH 100 INCREMENT BY 1';
        END IF;
      END;
    `);
    console.log('Category sequence initialized successfully');
  } catch (error) {
    console.error('Error creating category sequence:', error);
  }
};

// Create sequence for budgets if doesn't exist
const createBudgetSequence = async () => {
  try {
    await execute(`
      DECLARE
        seq_exists NUMBER;
      BEGIN
        SELECT COUNT(*) INTO seq_exists
        FROM user_sequences
        WHERE sequence_name = 'BUDGET_SEQ';
        
        IF seq_exists = 0 THEN
          EXECUTE IMMEDIATE 'CREATE SEQUENCE budget_seq START WITH 1 INCREMENT BY 1';
        END IF;
      END;
    `);
    console.log('Budget sequence initialized successfully');
  } catch (error) {
    console.error('Error creating budget sequence:', error);
  }
};

// Initialize the database with required sequences
const initializeDatabase = async () => {
  await createCategorySequence();
  await createBudgetSequence();
};

export default initializeDatabase;