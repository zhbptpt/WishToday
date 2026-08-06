export async function mockDelay<T>(value: T, delayMs = 160): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  return value;
}

