import { PagesFunction, jsonResponse, handleOptions } from "../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestGet: PagesFunction = async ({ request }) => {
  return jsonResponse(
    {
      limits: {
        screenshotAi: 5,
        scamChecker: 10,
        fileTools: 20,
      },
      used: {
        screenshotAi: 0,
        scamChecker: 0,
        fileTools: 0,
      },
      remaining: {
        screenshotAi: 5,
        scamChecker: 10,
        fileTools: 20,
      },
    },
    200,
    request
  );
};
