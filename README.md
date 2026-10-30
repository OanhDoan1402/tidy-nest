# Tidy Nest: web bán hàng và trang quản trị

Đây là đợt 1 của dự án. Gồm:

- **Trang cửa hàng:** danh mục, trang sản phẩm, giỏ hàng, thanh toán dạng demo (không thu tiền) và khung chat với shop.
- **Trang quản trị (/admin):** có đăng nhập, gồm các mục Home, Orders, Products (thêm, sửa, tải ảnh), Inventory, Inbox và Analytics.
- **Dữ liệu:** lưu trên Supabase. Trang web chạy trên Vercel.

Đợt 2 sẽ thêm thông báo đẩy về điện thoại và Practice mode nối AI.

---

## Bước 1. Tạo tài khoản (miễn phí)

1. GitHub: https://github.com/signup
2. Supabase: https://supabase.com, chọn **Start your project** và đăng nhập bằng GitHub
3. Vercel: https://vercel.com/signup, chọn **Continue with GitHub**

## Bước 2. Tạo database trên Supabase

1. Bấm **New project**. Đặt tên (ví dụ `tidy-nest`), tạo mật khẩu database và lưu lại, chọn Region **East US (North Virginia)**, rồi bấm **Create new project**. Chờ khoảng 1 đến 2 phút.
2. Ở menu trái, vào **SQL Editor** rồi bấm **New query**.
3. Mở file `supabase/schema.sql` trong thư mục này, copy toàn bộ nội dung, dán vào ô truy vấn và bấm **Run**. Khi thấy "Success" là xong: các bảng và 12 sản phẩm mẫu đã được tạo.
4. Vào **Project Settings → API** (hoặc **Data API / API Keys**) và chép lại 3 giá trị:
   - **Project URL**, có dạng `https://xxxx.supabase.co`
   - **anon public** key
   - **service_role** key: **giữ bí mật**, không gửi cho ai và không đưa lên chỗ công khai.
5. **(Tùy chọn) Nạp dữ liệu mẫu để luyện tập:** mở thêm một **New query**, dán toàn bộ file `supabase/sample-data.sql` rồi bấm **Run**. Lệnh này tạo khoảng 1.000 đơn hàng, hơn 20.000 lượt truy cập trong 60 ngày gần nhất và vài cuộc chat mẫu, để trang Home và Analytics có số liệu như bản thiết kế. Mọi dữ liệu mẫu đều được đánh dấu riêng, và trang admin sẽ hiện thông báo "Sample data" chừng nào dữ liệu mẫu còn trong database. Bấm **Remove sample data** trên thông báo đó là xóa sạch.
6. Tạo tài khoản đăng nhập admin: vào **Authentication → Users → Add user → Create new user**. Nhập email và mật khẩu của bạn, đánh dấu **Auto Confirm User**, rồi bấm **Create user**.

## Bước 3. Đưa code lên GitHub

1. Trên GitHub, bấm **+** ở góc phải rồi chọn **New repository**. Đặt tên `tidy-nest`, chọn **Private** và bấm **Create repository**.
2. Ở trang repo vừa tạo, bấm **uploading an existing file**.
3. Giải nén file zip, mở thư mục `tidy-nest`, chọn **tất cả file và thư mục bên trong** rồi kéo thả vào trang GitHub. Bấm **Commit changes**.
   - Nếu GitHub không nhận kéo thả cả thư mục, hãy dùng app **GitHub Desktop** (https://desktop.github.com): chọn **Add → Add existing repository**, trỏ vào thư mục `tidy-nest`, rồi bấm **Publish repository** và chọn Private.

## Bước 4. Deploy lên Vercel

1. Trên Vercel, chọn **Add New… → Project** rồi **Import** repo `tidy-nest`.
2. Mở phần **Environment Variables** và thêm từng dòng sau:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL ở bước 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `ADMIN_EMAILS` | email bạn tạo ở Authentication (nhiều email thì cách nhau bằng dấu phẩy) |
| `NEXT_PUBLIC_STORE_NAME` | tên shop, ví dụ `Tidy Nest` |
| `STORE_TIMEZONE` | `America/New_York` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `CRON_SECRET` | một chuỗi ngẫu nhiên dài bất kỳ |

3. Bấm **Deploy** và chờ 1 đến 2 phút. Bạn sẽ có link dạng `https://tidy-nest-xxxx.vercel.app`.

## Bước 5. Chạy thử

1. Mở link web, thêm sản phẩm vào giỏ và đặt thử một đơn.
2. Bấm nút chat ở góc dưới bên phải và nhắn thử một tin.
3. Mở `link-web/admin` và đăng nhập bằng email, mật khẩu ở bước 2. Đơn hàng và tin nhắn vừa tạo sẽ hiện trong Orders và Inbox.

## Bước 6. Cài lên iPhone

Mở `link-web/admin` bằng **Safari**, chọn **Chia sẻ → Thêm vào Màn hình chính**. Từ giờ bạn mở trang quản trị bằng biểu tượng Tidy Nest trên màn hình chính.

---

## Câu hỏi thường gặp

**Sửa code thì web có tự cập nhật không?** Có. Mỗi lần bạn đổi file trên GitHub, Vercel sẽ tự deploy lại sau khoảng 1 phút.

**Supabase có bị tạm dừng không?** Gói miễn phí sẽ tạm dừng project sau một tuần không có hoạt động. File `vercel.json` đã cài sẵn một tác vụ gọi vào database mỗi ngày (đường dẫn `/api/keep-alive`) để giữ project luôn hoạt động. Nếu project vẫn bị dừng, bạn vào Supabase và bấm **Resume project**.

**Dòng chữ "Demo store" là gì?** Đó là thông báo cho người xem biết đơn đặt ở đây không được giao và không thu tiền. Chỉ đổi `NEXT_PUBLIC_DEMO_MODE` thành `false` khi bạn đã có hàng thật và đã gắn cổng thanh toán thật.

**Đổi ảnh sản phẩm thế nào?** Vào Admin → Products, chọn sản phẩm, bấm **Replace photo** rồi **Save**.

**Vercel gói Hobby có giới hạn gì?** Gói miễn phí chỉ dành cho dự án cá nhân, phi thương mại. Khi bán hàng thật, bạn cần nâng lên gói Pro hoặc chuyển sang nơi host khác.

## Cấu trúc thư mục

```
app/(store)/          trang cửa hàng: home, products, cart, checkout, thank-you
app/admin/            trang quản trị và các server action
app/api/              API: orders, chat, track, keep-alive
components/           giao diện dùng chung
lib/                  kết nối Supabase, định dạng tiền/ngày, tính Analytics
supabase/schema.sql   tạo database
public/products/      ảnh minh họa 12 sản phẩm mẫu
```

## Chạy trên máy của bạn (không bắt buộc)

Cần cài Node.js 18 trở lên. Copy `.env.example` thành `.env.local`, điền các giá trị, rồi chạy:

```
npm install
npm run dev
```

Sau đó mở http://localhost:3000.
