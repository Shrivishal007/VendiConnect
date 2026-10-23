const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL must be set in the Admin environment.');
}
export class ApiError extends Error {
    statusCode;
    data;
    constructor(message, statusCode, data) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.data = data;
    }
}
export async function request(endpoint, options = {}) {
    const { timeoutMs = 15000, headers = {}, ...customConfig } = options;
    // Retrieve token from localStorage if available
    const token = localStorage.getItem('vendiconnect_admin_token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    const config = {
        ...customConfig,
        headers: {
            ...defaultHeaders,
            ...headers,
        },
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    config.signal = controller.signal;
    const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        // Parse JSON or text
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        if (!response.ok) {
            if (response.status === 401) {
                // Clear stored token on unauthorized/expired session
                localStorage.removeItem('vendiconnect_admin_token');
                localStorage.removeItem('vendiconnect_admin_user');
                window.dispatchEvent(new CustomEvent('auth:expired'));
            }
            const errorMessage = (data && typeof data === 'object' && data.message) ||
                `Request failed with status ${response.status}`;
            throw new ApiError(errorMessage, response.status, data);
        }
        return data;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new ApiError('Request timed out. Please try again.', 408);
        }
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(error.message || 'Network error occurred. Ensure backend is running.', 0);
    }
}
