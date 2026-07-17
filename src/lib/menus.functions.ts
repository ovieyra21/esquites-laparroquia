import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

const idInput = z.object({ id: z.string() });
const publicMenuInput = z.object({ id: z.string().optional().nullable() }).optional();
const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  base64: z.string().min(1),
  contentType: z.string().max(100).default("application/pdf"),
});

export const listMenus = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/digital_menus');
  });

export const uploadMenu = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/digital_menus', {
      filename: data.filename,
      file_data: data.base64,
      content_type: data.contentType,
    });
  });

export const setActiveMenu = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/digital_menus/activate', { id: data.id });
  });

export const deleteMenu = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.delete(`/api/digital_menus/${data.id}`);
  });

export const getMenuSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.get(`/api/digital_menus/${data.id}/url`);
  });

export const getPublicMenuUrl = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => publicMenuInput.parse(d) ?? {})
  .handler(async ({ data }) => {
    const params = data?.id ? `?id=${data.id}` : '?active=true';
    return localApi.get(`/api/digital_menus/public-url${params}`);
  });
