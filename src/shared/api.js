const API_URL = 'https://sila.silasystem.com:7103/General/GeneralAPI/';

const BASE_BODY = {
  AppVersionWeb: '1',
  AppVersionAndroid: '1',
  AppVersionIos: '1',
  AppVersionDesktop: '1',
  FireBaseToken: '',
  PlatForm: 'web',
};

export async function apiCall(operation, lineData = null, extraParams = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Sp_Name': 'CP.APICPOperation',
    },
    body: JSON.stringify({
      ...BASE_BODY,
      Operation: operation,
      LineData: lineData ? JSON.stringify(lineData) : null,
      User: sessionStorage.getItem('UserName') || '',
      ...extraParams,
    }),
  });
  const text = await res.text();
  console.log(operation, 'raw:', text);
  if (!text) throw new Error('Empty response');
  return JSON.parse(text);
}
