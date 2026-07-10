import api from './axios';

export const authApi = {
  register:        (data) => api.post('/auth/register', data),
  login:           (data) => api.post('/auth/login', data),
  logout:          ()     => api.post('/auth/logout'),
  me:              ()     => api.get('/auth/me'),
  verifyEmail:     (tok)  => api.get(`/auth/verify/${tok}`),
  resetRequest:    (data) => api.post('/auth/reset-request', data),
  resetPass:       (data) => api.post('/auth/reset-password', data),
  updateProfile:   (data) => api.patch('/auth/profile', data),
  changePassword:  (data) => api.post('/auth/change-password', data),
};
