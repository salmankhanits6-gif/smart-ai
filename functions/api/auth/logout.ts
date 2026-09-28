import { PagesFunction, jsonResponse, handleOptions } from "../../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  return jsonResponse({ success: true }, 200, request);
};
