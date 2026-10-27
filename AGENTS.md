# Origin Medaka — 引き継ぎ資料（AGENTS.md）

改良メダカ専門店 Origin Medaka のECサイト。クライアント（事業主）は清野快斗さん、開発担当は別の人間。
本番: https://www.originmedaka.com ／ 管理画面: https://www.originmedaka.com/admin/
リポジトリ: https://github.com/tratssai71-create/origin-medaka（`main` にpushするとVercelが自動デプロイ）

## 構成
- フロント: ビルド工程なしの静的HTML/CSS/JS。`index.html` と各ページ（`collection/` `product/` `cart/` `account/` `favorites/` `contact/` など）。共通JSは `assets/js/main.js`、共通CSSは `assets/css/style.css`。
- バックエンド: Vercelサーバー関数（Node.js, CommonJS）。`api/` 配下。**PHPは使っていない。**
- 依存: `stripe`, `@vercel/blob` のみ（`package.json`）。
- データ保存: Upstash Redis REST（Vercel KV）。`api/_lib/kv.js` が最小クライアント。
  - `om_products` … 商品配列（初回は `api/_data/products-full.json` をシードとして書き込み）
  - `om_user_index` / `om_user:<email>` … 会員
- 画像・動画: Vercel Blob（**Publicストア**）。`api/admin/upload.js` が base64 で受けて `put()`。

## 主なAPI
| パス | 役割 |
|---|---|
| `GET /api/products` | 公開商品一覧（`active !== false` のみ） |
| `/api/admin/[action]` | `login` `logout` `users`（管理者のみ） |
| `/api/admin/products` | 商品の GET/POST/PUT/DELETE（要管理者セッション） |
| `/api/admin/upload` | 画像・動画アップロード |
| `/api/auth/[action]` | 会員の signup / login / logout 等 |
| `/api/create-checkout-session` | Stripe Checkout セッション作成 |
| `/api/webhooks/stripe` | 決済完了通知。在庫減算とResendでメール送信 |

## 環境変数（Vercelに設定済み。値はここに書かない）
`ADMIN_PASSWORD` `ADMIN_SESSION_SECRET` `KV_REST_API_URL` `KV_REST_API_TOKEN` `STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` `RESEND_API_KEY` `BLOB_READ_WRITE_TOKEN`
- 秘密情報はチャットやコミットに貼らない。値の登録は各サービスの画面でユーザー本人が行う。

## 商品データモデル
`id, name, description, price, stock, image(サムネ), images[], videos[], grade, bloodline, birthMonth, individualId, emotionalDescription, createdAt, active, type('actual'|'image'), isNew`
- `image` は `images` の中から★で選んだサムネイル。未指定なら `images[0]`。
- 一覧は `createdAt` 降順。NEWバッジは `isNew` が真偽値ならそれを優先、なければ作成から30日以内で自動。
- 動画は1本3MBまで（Vercel関数のリクエスト上限4.5MBとbase64の膨らみのため）。Proプランでも関数のボディ上限は変わらない前提。大きい動画を扱うなら `@vercel/blob/client` の直接アップロードに作り替える。

## 認証
- 管理者: パスワード→HMAC署名Cookie（`om_admin_session`、有効30日）。`api/_lib/auth.js`
- 会員: `api/_lib/customerAuth.js`。購入にはログイン必須。

## 運用ルール・注意点
- 元サイト `https://origin-medaka.com`（ハイフン付き）が参照元。更新があれば内容・UIを合わせてほしいと依頼される。比較は `main` の `textContent` を取る（`innerText` はスクロール連動の表示で欠ける）。
- Vercel Hobbyは関数数が12個まで。`[action].js` 方式でまとめているのはそのため。むやみにファイルを増やさない。
- Blobストアは**Public**必須（Privateは作成後に変更不可で、商品画像が表示できない）。
- 管理画面のスクリプトは `admin/index.html` に埋め込み。アイコンフォント（remixicon）は読み込んでいないので、記号は文字で書く。
- コミットは日本語で `add:` `fix:` `change:` の接頭辞。

## 未対応・保留
- Stripeのコンビニ/PayPay/銀行振込の有効化（任意）
- 領収書PDFのメール添付（保留）
- 実際の運用はVercel Hobbyで、商用利用にはPro（月$20）が必要。所有者は現在開発者個人のアカウントで、クライアント側への移管（Transfer）か課金の判断待ち。
- Origin Experience Box の詳細ページ（元サイトでも未実装。ホームのセクションのみ実装済み）

## ローカル確認
- `npx serve -l 4173 .` で静的部分は確認できる。`/api` はVercel上でしか動かないため、商品が空になるのは正常。
