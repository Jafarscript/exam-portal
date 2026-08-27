// Thin fetch wrapper used by every client component.
// Sends credentials and Authorization Bearer header for iframe compatibility.
export async function apiFetch(url, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    try {
      token = localStorage.getItem('exam_portal_token');
    } catch {
      // ignore
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
