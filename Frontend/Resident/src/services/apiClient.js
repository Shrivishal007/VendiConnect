import { getIdToken } from 'firebase/auth';
import { auth } from './firebase';
function getApiBaseUrl() {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (!configuredUrl) {
        throw new Error('Set EXPO_PUBLIC_API_URL to the VendiConnect backend URL.');
    }
    return configuredUrl;
}
const API_BASE_URL = getApiBaseUrl();
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
    const { timeoutMs = 12000, headers = {}, ...customConfig } = options;
    const token = auth.currentUser ? await getIdToken(auth.currentUser) : null;
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
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        if (!response.ok) {
            const errorMessage = (data && typeof data === 'object' && data.message) ||
                `Request failed with status ${response.status}`;
            throw new ApiError(errorMessage, response.status, data);
        }
        return data;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new ApiError('Request timed out. Please verify your connection.', 408);
        }
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(error.message || 'Unable to connect to VendiConnect backend service.', 0);
    }
}
