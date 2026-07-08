import axios from 'axios';

const api = axios.create({
    withCredentials: true
});

api.interceptors.request.use((config) => {
    // Access global CSRF token set by AuthContext
    const csrfToken = (window as any).csrfToken;
    if (csrfToken && config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

export default api;
