// src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

export const uploadDocument = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post('/upload-and-process/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const queryDocument = (filename, question) => {
  return apiClient.post('/query-document/', {
    filename: filename,
    question: question,
  });
};