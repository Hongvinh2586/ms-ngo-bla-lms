import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bỏ qua toàn bộ Row Level Security, nên chỉ
 * được tạo và dùng trong Server Action (file có "use server" ở đầu), không
 * bao giờ được import vào component "use client". Hiện chỉ dùng trong
 * inviteStudent() ở src/app/admin/students/actions.ts (tính năng mời học
 * viên qua email — nếu bạn chỉ dùng cách tự đăng ký + danh sách được phép,
 * tính năng này không bắt buộc phải hoạt động, file này chỉ cần tồn tại để
 * build không bị lỗi).
 *
 * Cần biến môi trường SUPABASE_SERVICE_ROLE_KEY trong Vercel (Project
 * Settings -> Environment Variables) — lấy key này ở Supabase Dashboard ->
 * Project Settings -> API -> service_role. Không bao giờ để lộ key này ra
 * trình duyệt hoặc commit vào code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (hoặc NEXT_PUBLIC_SUPABASE_URL) chưa được cấu hình trong Vercel. " +
        "Thêm vào Environment Variables rồi redeploy. Nếu bạn chỉ dùng cách học sinh tự đăng ký " +
        "(không dùng mời qua email), có thể bỏ qua việc cấu hình này."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
