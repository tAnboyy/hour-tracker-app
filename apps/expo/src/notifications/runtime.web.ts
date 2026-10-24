export async function getInitialNotificationRoute(): Promise<Record<string, string> | null> {
  return null;
}

export function subscribeNotificationEvents(_onRoute: (data: Record<string, string>) => void, _onChanged: () => void): () => void {
  return () => {};
}
