/**
 * Recursively converts BigInt fields in an object or array to standard JavaScript Numbers.
 * This prevents TypeError: Do not know how to serialize a BigInt when using JSON.stringify
 * or returning objects from Next.js server actions / API responses.
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    // If it's a Date object, leave it as is
    if (obj instanceof Date) {
      return obj;
    }
    // Handle Prisma Decimal or decimal.js
    if (typeof obj.toNumber === 'function') {
      return obj.toNumber();
    }
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [key, serializeBigInt(val)])
    );
  }
  
  return obj;
}
