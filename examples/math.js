/**
 * Adds two numbers together.
 * @param {number} a - The first number to add
 * @param {number} b - The second number to add
 * @returns {number} The sum of a and b
 * @example
 * // Returns 5
 * add(2, 3);
 */

/**
 * Adds two numbers together.
 * @param {number} a - The first number to add
 * @param {number} b - The second number to add
 * @returns {number} The sum of a and b
 * @example
 * // returns 5
 * add(2, 3);
 */

/**
 * Adds two numbers together.
 * @param {number} a - The first number to add
 * @param {number} b - The second number to add
 * @returns {number} The sum of a and b
 * @example
 * // Returns 5
 * add(2, 3);
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
 * // returns 3
 * sub(5, 2);
 * 
 * @example
 * // returns -1
 * sub(2, 3);
 */

/**
 * Subtracts the second number from the first number.
 * @param {number} a - The minuend (number to subtract from)
 * @param {number} b - The subtrahend (number to subtract)
 * @returns {number} The difference of a minus b
 * @example
 * // Returns 3
 * sub(5, 2);
 */

/**
 * Subtracts the second number from the first number.
 * @param {number} a - The minuend (number to subtract from)
 * @param {number} b - The subtrahend (number to subtract)
 * @returns {number} The difference of a minus b
 * @example
 * // Returns 3
 * sub(5, 2);
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
 * mul(-4, 3);
 */

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
 * 
 * @example
 * // Returns 4
 * div(8, 2);
 * 
 * @example
 * // Returns 2.5
 * div(5, 2);
 * 
 * @note This function does not handle division by zero. Passing 0 as the second parameter will return Infinity or -Infinity.
 */

/**
 * Divides two numbers.
 * 
 * @param {number} a - The dividend (number to be divided)
 * @param {number} b - The divisor (number to divide by)
 * @returns {number} The quotient of a divided by b
 * @throws {Error} Division by zero will result in Infinity
 * 
 * @example
 * div(10, 2); // returns 5
 * div(7, 3);  // returns 2.333...
 */

/**
 * Divides two numbers.
 * 
 * @param {number} a - The dividend (number to be divided)
 * @param {number} b - The divisor (number to divide by)
 * @returns {number} The quotient of a divided by b
 * @throws {Error} Returns Infinity if b is 0
 * 
 * @example
 * // Returns 4
 * div(8, 2);
 * 
 * @example
 * // Returns 2.5
 * div(5, 2);
 */

function div(a, b) {
    return a / b;
}
