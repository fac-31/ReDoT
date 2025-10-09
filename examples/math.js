/**
 * Adds two numbers together.
 * 
 * @param {number} a - The first number to add
 * @param {number} b - The second number to add
 * @returns {number} The sum of a and b
 * 
 * @example
 * // Returns 5
 * add(2, 3);
 * 
 * @example
 * // Works with decimals
 * add(1.5, 2.7); // Returns 4.2
 */

function add(a, b) {
    return a + b;
}

/**
 * Subtracts the second number from the first number.
 * @param {number} a - The minuend (number to subtract from)
 * @param {number} b - The subtrahend (number to subtract)
 * @returns {number} The difference of a minus b
 * @example
 * // Returns 3
 * sub(5, 2);
 * 
 * @example
 * // Returns -1
 * sub(2, 3);
 */

function sub(a, b) {
    return a - b;
}

/**
 * Multiplies two numbers and returns the result.
 * 
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {number} The product of a and b
 * 
 * @example
 * // Returns 15
 * mul(3, 5);
 * 
 * @example
 * // Returns -12
 * mul(4, -3);
 */

function mul(a, b) {
    return a * b;
}

/**
 * Divides two numbers.
 * 
 * @param {number} a - The dividend (number to be divided)
 * @param {number} b - The divisor (number to divide by)
 * @returns {number} The quotient of a divided by b
 * @throws {Error} When b is zero (division by zero)
 * 
 * @example
 * div(10, 2); // returns 5
 * div(7, 3); // returns 2.333...
 */

function div(a, b) {
    return a / b;
}