import bcrypt from 'bcrypt';

/**
 * hash plain text password (bcrypt with 10 rounds)
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}
