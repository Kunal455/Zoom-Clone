import axios from 'axios';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '').replace(/\/api$/, '');
const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const createMeeting = async (title: string, duration: number = 60, is_instant: boolean = true) => {
  const response = await api.post('/meetings', {
    title,
    duration,
    is_instant
  });
  return response.data;
};

export const scheduleMeeting = async (title: string, date: string, duration: number = 60) => {
  const response = await api.post('/meetings', {
    title,
    date,
    duration,
    is_instant: false
  });
  return response.data;
};

export const getMeeting = async (meetingId: string) => {
  const response = await api.get(`/meetings/${meetingId}`);
  return response.data;
};

export const getMeetings = async () => {
  const response = await api.get('/meetings');
  return response.data;
};

export const getContacts = async () => {
  const response = await api.get('/contacts');
  return response.data;
};

export const searchUsers = async (query: string) => {
  const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const addContact = async (contact_user_id: string) => {
  const response = await api.post('/contacts', { contact_user_id });
  return response.data;
};

export default api;
