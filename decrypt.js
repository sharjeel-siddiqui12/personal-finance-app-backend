import { hash as _hash, compare } from 'bcrypt';

/**
 * Hash a plain text password
 * @param {string} plainTextPassword - The password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 10)
 * @returns {Promise<string>} - The hashed password
 */
async function hashPassword(plainTextPassword, saltRounds = 10) {
    try {
        const hash = await _hash(plainTextPassword, saltRounds);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}

/**
 * Verify if a plain text password matches a hash
 * @param {string} plainTextPassword - The password to check
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 */
async function verifyPassword(plainTextPassword, hash) {
    try {
        const match = await compare(plainTextPassword, hash);
        return match;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
    }
}

// Example usage
async function example() {
    const password = 'admin123';
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log('Hashed password:', hashedPassword);
    
    // Verify correct password
    const isMatch = await verifyPassword(password, hashedPassword);
    console.log('Password matches:', isMatch); // Should be true
    
    // Verify incorrect password
    const isMatchWrong = await verifyPassword('wrong_password', hashedPassword);
    console.log('Wrong password matches:', isMatchWrong); // Should be false
}

// Run the example
example().catch(console.error);

export default {
    hashPassword,
    verifyPassword
};