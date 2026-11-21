require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const run = async () => {
  try {
    // ── Base Schema ───────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                  CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        first_name          VARCHAR(100) NOT NULL,
        last_name           VARCHAR(100) NOT NULL,
        email               VARCHAR(255) NOT NULL UNIQUE,
        password            VARCHAR(255) NOT NULL,
        role       VARCHAR(50)  NOT NULL DEFAULT 'member',
        avatar     MEDIUMTEXT   NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Convert role from ENUM to VARCHAR if the table already existed
    await db.query(`
      ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'member'
    `);

    // ── Enterprise / Subscription columns (idempotent) ─────────────────────────
    const safeAlter = async (sql) => { try { await db.query(sql); } catch (_) {} };
    await safeAlter(`ALTER TABLE users MODIFY COLUMN last_name VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN company_name       VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN referral_code      VARCHAR(20)  NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) NOT NULL DEFAULT 'TRIAL'`);
    await safeAlter(`ALTER TABLE users ADD COLUMN trial_start_at     DATETIME NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN trial_end_at       DATETIME NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN kyc_status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING'`);
    await safeAlter(`ALTER TABLE users ADD COLUMN discount_tier      TINYINT NULL`);
    await safeAlter(`ALTER TABLE users ADD COLUMN approved_sections  JSON NULL`);
    await safeAlter(`ALTER TABLE calendar_events ADD COLUMN location VARCHAR(255) NULL`);

    // ── Multi-tenancy: enterprise_id isolation (idempotent) ──────────────────
    await safeAlter(`ALTER TABLE users               ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE projects            ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE tasks               ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE employees           ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE leaves              ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE attendance          ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE campaigns           ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE leads               ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE invoices            ADD COLUMN enterprise_id CHAR(36) NULL`);

    // ── Accounts > Invoices: full invoice detail + partial-payment tracking (idempotent) ──
    await safeAlter(`ALTER TABLE invoices MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN invoice_number  VARCHAR(50)   NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN project_name    VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN my_name         VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN my_email        VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN my_address      TEXT          NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN my_phone        VARCHAR(50)   NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN client_email    VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN client_address  TEXT          NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN items           JSON          NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN discount        DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN tax_rate        DECIMAL(5,2)  NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN payment_method  VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN account_name    VARCHAR(255)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN bank_code       VARCHAR(100)  NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN account_number  VARCHAR(100)  NULL`);
    // Partial-payment tracking
    await safeAlter(`ALTER TABLE invoices ADD COLUMN amount_paid     DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN balance_due     DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN payment_date    DATE          NULL`);
    await safeAlter(`ALTER TABLE invoices ADD COLUMN notes           TEXT          NULL`);
    await safeAlter(`ALTER TABLE expenses            ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE transactions        ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE calendar_events     ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE kanban_cards        ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE files               ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE faq                 ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE email_campaigns     ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE email_templates     ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE social_posts        ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE marketing_influencers ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE marketing_field_events ADD COLUMN enterprise_id CHAR(36) NULL`);
    
    // Marketing Flow Links
    await safeAlter(`ALTER TABLE leads ADD COLUMN campaign_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE email_campaigns ADD COLUMN campaign_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE social_posts ADD COLUMN campaign_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE marketing_influencers ADD COLUMN campaign_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE marketing_field_events ADD COLUMN campaign_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE custom_reports      ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE hr_announcements    ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE hr_trainings        ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE hr_awards           ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts      ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_contacts      ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_deals         ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_proposals     ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_estimates     ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices      ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_payments      ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_credit_notes  ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_items         ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE kb_categories       ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE kb_articles         ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE assets              ADD COLUMN enterprise_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE activities          ADD COLUMN enterprise_id CHAR(36) NULL`);

    // ── Coupons ────────────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id            CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        code          VARCHAR(50) NOT NULL UNIQUE,
        discount_pct  TINYINT     NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        enterprise_id CHAR(36)    NULL,
        created_by    CHAR(36)    NOT NULL,
        expires_at    DATETIME    NULL,
        created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        status     ENUM('Planning','In Progress','Review','Completed','On Hold') NOT NULL DEFAULT 'Planning',
        progress   TINYINT      NOT NULL DEFAULT 0,
        priority   ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
        due_date   DATE         NULL,
        start_date DATE         NULL,
        color      VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id CHAR(36) NOT NULL,
        user_id    CHAR(36) NOT NULL,
        PRIMARY KEY (project_id, user_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        project_id  CHAR(36)     NULL,
        assignee_id CHAR(36)     NULL,
        status      ENUM('Todo','In Progress','Review','Done') NOT NULL DEFAULT 'Todo',
        priority    ENUM('Low','Medium','High','Critical')      NOT NULL DEFAULT 'Medium',
        due_date    DATE         NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (assignee_id) REFERENCES users(id)    ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id                CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        user_id           CHAR(36)      NULL,
        employee_code     VARCHAR(50)   NULL UNIQUE,
        name              VARCHAR(200)  NOT NULL,
        role              VARCHAR(150)  NOT NULL,
        department        VARCHAR(150)  NOT NULL,
        salary            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status            ENUM('Active','Inactive','On Leave') NOT NULL DEFAULT 'Active',
        join_date         DATE          NOT NULL,
        phone             VARCHAR(50)   NULL,
        email             VARCHAR(255)  NULL,
        emergency_contact VARCHAR(255)  NULL,
        emp_rank          VARCHAR(100)  NULL,
        account_no        VARCHAR(100)  NULL,
        ifsc_code         VARCHAR(100)  NULL,
        uan               VARCHAR(100)  NULL,
        esi               VARCHAR(100)  NULL,
        created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    // Add new columns to already-existing employees tables (safe, idempotent)
    await safeAlter(`ALTER TABLE employees ADD COLUMN phone             VARCHAR(50)  NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN email             VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN emergency_contact VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN emp_rank          VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN account_no        VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN ifsc_code         VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN uan               VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN esi               VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN employee_code     VARCHAR(50)  NULL UNIQUE`);
    await safeAlter(`ALTER TABLE employees ADD COLUMN branch            VARCHAR(100) NULL`);
    // Rename legacy `rank` column to emp_rank (idempotent — fails silently if already done)
    await safeAlter("ALTER TABLE employees CHANGE `rank` emp_rank VARCHAR(100) NULL");

    await db.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id          CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        employee_id CHAR(36)  NOT NULL,
        type        ENUM('Annual','Medical','Casual','Unpaid','Other') NOT NULL DEFAULT 'Annual',
        start_date  DATE      NOT NULL,
        end_date    DATE      NOT NULL,
        reason      TEXT      NULL,
        status      ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
        created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        employee_id CHAR(36) NOT NULL,
        date        DATE     NOT NULL,
        check_in    TIME     NULL,
        check_out   TIME     NULL,
        status      ENUM('Present','Absent','Late','On Leave','Holiday') NOT NULL DEFAULT 'Present',
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_emp_date (employee_id, date),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        channel     ENUM('Email','Social','Display','Search','Mixed','Other') NOT NULL DEFAULT 'Email',
        status      ENUM('Planning','Active','Paused','Ended') NOT NULL DEFAULT 'Planning',
        budget      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        spent       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        leads       INT           NOT NULL DEFAULT 0,
        conversions INT           NOT NULL DEFAULT 0,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id         CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(200)  NOT NULL,
        company    VARCHAR(200)  NULL,
        email      VARCHAR(255)  NOT NULL,
        status     ENUM('New','Contacted','Qualified','Proposal','Closed Won','Closed Lost') NOT NULL DEFAULT 'New',
        value      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        source     VARCHAR(100)  NULL,
        campaign_id CHAR(36)     NULL,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE leads ADD COLUMN phone VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE leads ADD COLUMN job_title VARCHAR(150) NULL`);
    await safeAlter(`ALTER TABLE leads ADD COLUMN lead_score INT NOT NULL DEFAULT 0`);
    await safeAlter(`ALTER TABLE leads ADD COLUMN assigned_to VARCHAR(200) NULL`);
    await safeAlter(`ALTER TABLE leads ADD COLUMN follow_up_date DATE NULL`);
    await safeAlter(`ALTER TABLE leads ADD COLUMN notes TEXT NULL`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id         CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        client     VARCHAR(255)  NOT NULL,
        amount     DECIMAL(12,2) NOT NULL,
        status     ENUM('Pending','Paid','Overdue','Cancelled') NOT NULL DEFAULT 'Pending',
        issue_date DATE          NOT NULL DEFAULT (CURRENT_DATE),
        due_date   DATE          NULL,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        category    VARCHAR(150)  NOT NULL,
        amount      DECIMAL(12,2) NOT NULL,
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        description TEXT          NULL,
        status      ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        type        ENUM('Credit','Debit') NOT NULL,
        amount      DECIMAL(12,2) NOT NULL,
        party       VARCHAR(255)  NULL,
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        description TEXT          NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE transactions ADD COLUMN category VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN method VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN account_name VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN time VARCHAR(20) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN attachment_path VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Completed'`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN tags VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE transactions ADD COLUMN notes TEXT NULL`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        start_dt   DATETIME     NOT NULL,
        end_dt     DATETIME     NULL,
        type       VARCHAR(50)  NOT NULL DEFAULT 'event',
        color      VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
        location   VARCHAR(255) NULL,
        user_id    CHAR(36)     NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kanban_cards (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        col_name   VARCHAR(100) NOT NULL DEFAULT 'Todo',
        priority   ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
        assignee   VARCHAR(200) NULL,
        position   INT          NOT NULL DEFAULT 0,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE kanban_cards ADD COLUMN enterprise_id CHAR(36) NULL`);
await safeAlter(`ALTER TABLE kanban_cards ADD COLUMN created_by CHAR(36) NULL`);
await safeAlter(`ALTER TABLE kanban_cards ADD COLUMN due_date DATE NULL`);

await db.query(`
  CREATE TABLE IF NOT EXISTS kanban_card_history (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    card_id       CHAR(36)     NOT NULL,
    from_col      VARCHAR(100) NULL,
    to_col        VARCHAR(100) NOT NULL,
    moved_by      CHAR(36)     NULL,
    enterprise_id CHAR(36)     NULL,
    moved_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE
  )
`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        size       BIGINT       NOT NULL DEFAULT 0,
        type       VARCHAR(50)  NOT NULL DEFAULT 'other',
        owner      VARCHAR(200) NULL,
        folder     VARCHAR(200) NOT NULL DEFAULT 'Root',
        modified   DATE         NOT NULL DEFAULT (CURRENT_DATE),
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS faq (
        id         CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        question   TEXT     NOT NULL,
        answer     TEXT     NOT NULL,
        category   VARCHAR(100) NOT NULL DEFAULT 'General',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        project_id    CHAR(36)     NOT NULL,
        name          VARCHAR(100) NOT NULL,
        start_day     INT          NOT NULL DEFAULT 1,
        duration_days INT          NOT NULL DEFAULT 7,
        done          TINYINT(1)   NOT NULL DEFAULT 0,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        project_id CHAR(36)     NOT NULL,
        day        INT          NOT NULL DEFAULT 1,
        label      VARCHAR(150) NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id           CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        subject      VARCHAR(255) NOT NULL,
        list         VARCHAR(150) NOT NULL DEFAULT 'All Subscribers',
        recipients   INT          NOT NULL DEFAULT 0,
        opens        INT          NOT NULL DEFAULT 0,
        clicks       INT          NOT NULL DEFAULT 0,
        unsubscribes INT          NOT NULL DEFAULT 0,
        status       ENUM('Sent','Scheduled','Draft') NOT NULL DEFAULT 'Draft',
        campaign_id  CHAR(36)     NULL,
        scheduled_at DATETIME     NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(150) NOT NULL,
        category   VARCHAR(100) NOT NULL DEFAULT 'General',
        uses       INT          NOT NULL DEFAULT 0,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id           CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        content      TEXT        NOT NULL,
        platform     ENUM('Instagram','Twitter','LinkedIn','Facebook') NOT NULL,
        status       ENUM('Published','Scheduled','Draft') NOT NULL DEFAULT 'Draft',
        likes        INT         NOT NULL DEFAULT 0,
        comments     INT         NOT NULL DEFAULT 0,
        shares       INT         NOT NULL DEFAULT 0,
        reach        VARCHAR(20) NOT NULL DEFAULT '—',
        campaign_id  CHAR(36)    NULL,
        scheduled_at DATETIME    NULL,
        created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS social_platform_stats (
        id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        platform      ENUM('Instagram','Twitter','LinkedIn','Facebook') NOT NULL,
        enterprise_id CHAR(36)     NULL,
        followers     INT          NOT NULL DEFAULT 0,
        growth_pct    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        posts         INT          NOT NULL DEFAULT 0,
        engagement    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        color         VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await safeAlter(`ALTER TABLE social_platform_stats ADD COLUMN enterprise_id CHAR(36) NULL`);

    // ── Extended Marketing Tables ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_influencers (
        id           CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name         VARCHAR(255)  NOT NULL,
        platform     VARCHAR(100)  NOT NULL,
        handle       VARCHAR(100)  NOT NULL,
        followers    INT           NOT NULL DEFAULT 0,
        niche        VARCHAR(100)  NULL,
        status       ENUM('Contacted','Negotiating','Active','Completed') NOT NULL DEFAULT 'Contacted',
        budget       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        campaign_id  CHAR(36)      NULL,
        created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_field_events (
        id           CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name         VARCHAR(255)  NOT NULL,
        location     VARCHAR(255)  NOT NULL,
        type         ENUM('Trade Show','Conference','Pop-up','Meetup','Workshop') NOT NULL DEFAULT 'Trade Show',
        status       ENUM('Planning','Confirmed','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Planning',
        budget       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        leads_target INT           NOT NULL DEFAULT 0,
        campaign_id  CHAR(36)      NULL,
        date         DATE          NOT NULL,
        created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_reports (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        source     VARCHAR(50)  NOT NULL,
        fields     JSON         NOT NULL DEFAULT ('[]'),
        filters    JSON         NOT NULL DEFAULT ('[]'),
        viz_type   VARCHAR(20)  NOT NULL DEFAULT 'table',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS hr_announcements (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        tag        VARCHAR(50)  NOT NULL DEFAULT 'HR',
        urgent     TINYINT(1)   NOT NULL DEFAULT 0,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS hr_trainings (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        category   VARCHAR(100) NOT NULL DEFAULT 'General',
        progress   TINYINT      NOT NULL DEFAULT 0,
        enrolled   INT          NOT NULL DEFAULT 0,
        color      VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS hr_awards (
        id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        employee_name VARCHAR(200) NOT NULL,
        award_title   VARCHAR(200) NOT NULL,
        month         VARCHAR(50)  NOT NULL,
        color         VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Seed HR announcements if empty ────────────────────────────────────────
    const [[{ annCount }]] = await db.query('SELECT COUNT(*) AS annCount FROM hr_announcements');
    if (annCount === 0) {
      await db.query(`
        INSERT INTO hr_announcements (id, title, tag, urgent) VALUES
          (UUID(), 'Q2 2026 Performance Reviews scheduled for May 20–30', 'HR',      1),
          (UUID(), 'New Remote Work Policy — effective June 1',           'Policy',  0),
          (UUID(), 'Annual Health Check-up Drive — Book your slot',       'Wellness',0),
          (UUID(), 'Company Outing — July 12, register by June 28',       'Events',  0)
      `);
    }

    // ── Seed HR trainings if empty ────────────────────────────────────────────
    const [[{ trainCount }]] = await db.query('SELECT COUNT(*) AS trainCount FROM hr_trainings');
    if (trainCount === 0) {
      await db.query(`
        INSERT INTO hr_trainings (id, title, category, progress, enrolled, color) VALUES
          (UUID(), 'React Advanced Patterns',  'Tech',       72, 24, '#939BFF'),
          (UUID(), 'Leadership Essentials',    'Soft Skills',45, 18, '#C4B5F4'),
          (UUID(), 'Data Privacy & GDPR',      'Compliance', 90, 31, '#AEE9FF'),
          (UUID(), 'Effective Communication',  'Soft Skills',30, 15, '#B6EADA')
      `);
    }

    // ── Seed HR awards if empty ───────────────────────────────────────────────
    const [[{ awardCount }]] = await db.query('SELECT COUNT(*) AS awardCount FROM hr_awards');
    if (awardCount === 0) {
      await db.query(`
        INSERT INTO hr_awards (id, employee_name, award_title, month, color) VALUES
          (UUID(), 'Employee of the Month', 'Top Performer',  'May 2026',      '#939BFF'),
          (UUID(), 'Best Innovator',        'Innovation Star','April 2026',    '#C4B5F4'),
          (UUID(), 'Data Star',             'Analytics Lead', 'March 2026',    '#AEE9FF')
      `);
    }

    // ── Seed social platform stats if empty ───────────────────────────────────
    const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM social_platform_stats');
    if (c === 0) {
      await db.query(`
        INSERT IGNORE INTO social_platform_stats (id, platform, followers, growth_pct, posts, engagement, color) VALUES
          (UUID(), 'Instagram', 48200, 3.40, 142, 4.80, '#E1306C'),
          (UUID(), 'Twitter',   22800, 1.80, 318, 2.10, '#1DA1F2'),
          (UUID(), 'LinkedIn',  15400, 5.20,  84, 6.30, '#0A66C2'),
          (UUID(), 'Facebook',  31600, 0.90,  96, 1.40, '#1877F2')
      `);
    }

    // ── Seed FAQ if empty ────────────────────────────────────────────────────
    const [[{ faqCount }]] = await db.query('SELECT COUNT(*) AS faqCount FROM faq');
    if (faqCount === 0) {
      await db.query(`
        INSERT INTO faq (id, question, answer, category) VALUES
          (UUID(),'How do I change my account email address?','Go to Profile → Personal Information and update your email field. You will receive a verification email to the new address before the change takes effect.','account'),
          (UUID(),'Can I have multiple workspaces under one account?','Yes! Pro and Enterprise plans support multiple workspaces. Navigate to Settings → Workspaces to create and manage them. Each workspace has its own members, projects and billing.','account'),
          (UUID(),'How do I upgrade or downgrade my plan?','Visit Pricing Plans in the sidebar and select the plan you want. Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.','billing'),
          (UUID(),'What happens if I miss a payment?','We will retry the payment three times over 7 days. If all attempts fail, your account will be downgraded to the free Starter plan. Your data is never deleted.','billing'),
          (UUID(),'Can I get a refund?','We offer a full refund within 14 days of your initial purchase if you are not satisfied. Contact support to initiate a refund request.','billing'),
          (UUID(),'How do I export data from AMINOID?','Most tables and reports have an Export button in the toolbar. You can export as CSV, Excel, or PDF. For bulk exports, go to Reports → Custom Report.','features'),
          (UUID(),'Can I connect AMINOID to external tools?','Yes! AMINOID integrates with 40+ tools including Slack, Salesforce, Stripe, Postgres, BigQuery and more. Go to Settings → Integrations to connect your tools.','features'),
          (UUID(),'Is there a mobile app?','Our mobile app for iOS and Android is currently in beta. You can sign up for early access through Profile → Beta Programs.','features'),
          (UUID(),'How do I set up automated reports?','Go to Reports → any report page and click the schedule icon. Set a frequency (daily, weekly, monthly), choose recipients, and select the format.','features'),
          (UUID(),'How is my data protected?','All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are SOC 2 Type II and GDPR compliant with regular automated backups.','security'),
          (UUID(),'How do I enable two-factor authentication?','Go to Profile → Security and click Enable 2FA. Scan the QR code with any authenticator app (Google Authenticator, Authy, 1Password).','security'),
          (UUID(),'How do I customise the sidebar navigation?','Click the panel icon at the top of the sidebar to collapse or expand the full navigation panel.','settings')
      `);
    }

    // ── Seed email templates if empty ─────────────────────────────────────────
    const [[{ t }]] = await db.query('SELECT COUNT(*) AS t FROM email_templates');
    if (t === 0) {
      await db.query(`
        INSERT IGNORE INTO email_templates (id, name, category, uses) VALUES
          (UUID(), 'Product Announcement', 'Launch',     14),
          (UUID(), 'Weekly Newsletter',    'Newsletter', 28),
          (UUID(), 'Welcome Series',       'Onboarding',  8),
          (UUID(), 'Re-engagement',        'Retention',   6)
      `);
    }

    // Widen avatar column on existing databases (safe to run repeatedly)
    await db.query(`ALTER TABLE users MODIFY COLUMN avatar MEDIUMTEXT NULL`).catch(() => {});

    // ── Sales Accounts ────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_accounts (
        id             CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name           VARCHAR(255)  NOT NULL,
        industry       VARCHAR(100)  NOT NULL DEFAULT 'Other',
        status         ENUM('Active','Inactive','Prospect','Churned') NOT NULL DEFAULT 'Prospect',
        revenue        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        website        VARCHAR(255)  NULL,
        phone          VARCHAR(50)   NULL,
        owner          VARCHAR(200)  NULL,
        company_email  VARCHAR(255)  NULL,
        company_size   VARCHAR(100)  NULL,
        address        TEXT          NULL,
        account_owner  VARCHAR(200)  NULL,
        account_type   VARCHAR(50)   NULL,
        lead_source    VARCHAR(100)  NULL,
        currency       VARCHAR(20)   NULL DEFAULT 'USD',
        tax_id         VARCHAR(100)  NULL,
        payment_terms  VARCHAR(100)  NULL,
        description    TEXT          NULL,
        social_links   TEXT          NULL,
        tags           TEXT          NULL,
        attachments    JSON          NULL,
        notes          TEXT          NULL,
        created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN company_email VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN company_size VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN address TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN account_owner VARCHAR(200) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN account_type VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN lead_source VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN currency VARCHAR(20) NULL DEFAULT 'USD'`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN tax_id VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN payment_terms VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN description TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN social_links TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN tags TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN attachments JSON NULL`);
    await safeAlter(`ALTER TABLE sales_accounts ADD COLUMN notes TEXT NULL`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_contacts (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        account_id CHAR(36)     NULL,
        name       VARCHAR(200) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        phone      VARCHAR(50)  NULL,
        title      VARCHAR(150) NULL,
        status     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_deals (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        account_id  CHAR(36)      NULL,
        name        VARCHAR(255)  NOT NULL,
        stage       ENUM('Prospecting','Qualification','Proposal','Negotiation','Closed Won','Closed Lost') NOT NULL DEFAULT 'Prospecting',
        value       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        owner       VARCHAR(200)  NULL,
        close_date  DATE          NULL,
        probability TINYINT       NOT NULL DEFAULT 0,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_proposals (
        id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        proposal_no VARCHAR(50) NOT NULL UNIQUE,
        account_id CHAR(36) NULL,
        contact_person VARCHAR(100) NULL,
        valid_until DATE NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        proposal_type VARCHAR(50) NULL,
        sales_person VARCHAR(100) NULL,
        notes TEXT NULL,
        summary TEXT NULL,
        status ENUM('Draft', 'Sent', 'Open', 'Revised', 'Declined', 'Accepted') NOT NULL DEFAULT 'Draft',
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        enterprise_id CHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_proposal_items (
        id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        proposal_id CHAR(36) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        quantity INT NOT NULL DEFAULT 1,
        rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (proposal_id) REFERENCES sales_proposals(id) ON DELETE CASCADE
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_estimates (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        account_id  CHAR(36)      NULL,
        estimate_no VARCHAR(50)   NOT NULL UNIQUE,
        status      ENUM('Draft','Sent','Expired','Declined','Accepted') NOT NULL DEFAULT 'Draft',
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        expiry_date DATE          NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);
    
    await safeAlter(`ALTER TABLE sales_estimates ADD COLUMN billing_address TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_estimates ADD COLUMN notes TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_estimates ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_estimate_items (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        estimate_id CHAR(36)      NOT NULL,
        item_name   VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        quantity    INT           NOT NULL DEFAULT 1,
        rate        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        discount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tax_rate    DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (estimate_id) REFERENCES sales_estimates(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_estimate_attachments (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        estimate_id CHAR(36)      NOT NULL,
        file_name   VARCHAR(255)  NOT NULL,
        file_path   VARCHAR(255)  NOT NULL,
        file_type   VARCHAR(50)   NOT NULL,
        file_size   INT           NOT NULL,
        uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES sales_estimates(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        account_id  CHAR(36)      NULL,
        invoice_no  VARCHAR(50)   NOT NULL UNIQUE,
        status      ENUM('Unpaid','Partially Paid','Paid','Overdue','Cancelled') NOT NULL DEFAULT 'Unpaid',
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        due_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        due_date    DATE          NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);
    
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN billing_address TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN payment_terms VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN sales_person VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN notes TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'`);
    await safeAlter(`ALTER TABLE sales_invoices MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Draft'`);
    await safeAlter(`ALTER TABLE sales_invoices MODIFY COLUMN currency VARCHAR(50) NOT NULL DEFAULT 'USD'`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        invoice_id  CHAR(36)      NOT NULL,
        item_name   VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        quantity    INT           NOT NULL DEFAULT 1,
        rate        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE
      )
    `);

    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN discount DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00`);

    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN payment_method VARCHAR(100) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN bank_account_name VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN bank_code VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_invoices ADD COLUMN account_number VARCHAR(50) NULL`);


    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN discount DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN taxRate DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN unit VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN item_code VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN hsn VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN sku VARCHAR(50) NULL`);

    await safeAlter(`ALTER TABLE sales_invoice_items ADD COLUMN item_order INT NOT NULL DEFAULT 0`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_invoice_attachments (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        invoice_id  CHAR(36)      NOT NULL,
        file_name   VARCHAR(255)  NOT NULL,
        file_path   VARCHAR(255)  NOT NULL,
        file_type   VARCHAR(50)   NOT NULL,
        file_size   INT           NOT NULL,
        uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_payments (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        invoice_id  CHAR(36)      NULL,
        amount      DECIMAL(12,2) NOT NULL,
        method VARCHAR(100) NOT NULL DEFAULT 'Bank Transfer',
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        transaction_id VARCHAR(100) NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE SET NULL
      )
    `);

    await safeAlter(`ALTER TABLE sales_payments ADD COLUMN account_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_payments ADD CONSTRAINT fk_payments_account FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL`);
    await safeAlter(`ALTER TABLE sales_payments ADD COLUMN payment_for VARCHAR(100) NOT NULL DEFAULT 'Invoice'`);
    await safeAlter(`ALTER TABLE sales_payments ADD COLUMN deposit_to VARCHAR(255) NULL`);
    await safeAlter(`ALTER TABLE sales_payments ADD COLUMN notes TEXT NULL`);
    await safeAlter(`ALTER TABLE sales_payments ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Completed'`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_credit_notes (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        account_id  CHAR(36)      NULL,
        note_no     VARCHAR(50)   NOT NULL UNIQUE,
        amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        date        DATE          NOT NULL DEFAULT (CURRENT_DATE),
        reason      TEXT          NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES sales_accounts(id) ON DELETE SET NULL
      )
    `);
    
    await safeAlter(`ALTER TABLE sales_credit_notes ADD COLUMN invoice_id CHAR(36) NULL`);
    await safeAlter(`ALTER TABLE sales_credit_notes ADD COLUMN credit_type VARCHAR(50) NULL`);
    await safeAlter(`ALTER TABLE sales_credit_notes ADD COLUMN notes TEXT NULL`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_items (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        rate        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        unit        VARCHAR(50)   NOT NULL DEFAULT 'pcs',
        category    VARCHAR(100)  NULL,
        tax_rate    DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE sales_items ADD COLUMN code VARCHAR(50) NULL`);

    // ── Knowledge Base ────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS kb_categories (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        icon       VARCHAR(50)  NOT NULL DEFAULT 'BookOpen',
        color      VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        category_id CHAR(36)     NULL,
        title       VARCHAR(255) NOT NULL,
        content     LONGTEXT     NOT NULL,
        status      ENUM('Published','Draft','Archived') NOT NULL DEFAULT 'Draft',
        author      VARCHAR(200) NOT NULL DEFAULT 'Admin',
        views       INT          NOT NULL DEFAULT 0,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES kb_categories(id) ON DELETE SET NULL
      )
    `);

    // ── Plans ─────────────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name             VARCHAR(100) NOT NULL UNIQUE,
        description      VARCHAR(255) NULL,
        price_monthly    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        price_annual     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        max_users        INT          NOT NULL DEFAULT 1,
        max_storage_gb   DECIMAL(8,2) NOT NULL DEFAULT 1.00,
        max_api_calls    INT          NOT NULL DEFAULT 1000,
        features_json    JSON         NOT NULL DEFAULT ('[]'),
        color_theme      VARCHAR(20)  NOT NULL DEFAULT 'default',
        is_active        TINYINT(1)   NOT NULL DEFAULT 1,
        created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── Seed Plans if empty ───────────────────────────────────────────────────
    const [[{ pCount }]] = await db.query('SELECT COUNT(*) AS pCount FROM plans');
    if (pCount === 0) {
      await db.query(`
        INSERT INTO plans (id, name, description, price_monthly, price_annual, max_users, max_storage_gb, max_api_calls, features_json, color_theme) VALUES
          (UUID(), 'Free Trial', '15-day trial', 0.00, 0.00, 1, 1.00, 1000, JSON_ARRAY('1 user seat', '15-day free trial', '1 GB storage', '1,000 API calls', 'Email support'), 'emerald'),
          (UUID(), 'Starter', 'Up to 5 users', 2499.00, 24990.00, 5, 5.00, 10000, JSON_ARRAY('5 user seats', '5 GB storage', '10,000 API calls/mo', 'Basic reporting', 'Standard email support'), 'default'),
          (UUID(), 'Growth', 'Up to 15 users', 5999.00, 59990.00, 15, 50.00, 100000, JSON_ARRAY('Everything in Starter', '15 user seats', '50 GB storage', '100,000 API calls/mo', 'Priority 24/7 support'), 'default'),
          (UUID(), 'Custom', 'Custom seats', 15500.00, 155000.00, 9999, 9999.00, 9999999, JSON_ARRAY('Fully isolated workspace', 'Custom user seats', 'Tailored storage limits', 'Dedicated support SLA', 'Custom pricing & features'), 'amber')
      `);
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id               CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        plan             VARCHAR(100)  NOT NULL DEFAULT 'Starter',
        status           ENUM('Active','Trialing','Cancelled','Past Due') NOT NULL DEFAULT 'Active',
        seats_used       INT           NOT NULL DEFAULT 1,
        seats_total      INT           NOT NULL DEFAULT 5,
        storage_used_gb  DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
        storage_total_gb DECIMAL(8,2)  NOT NULL DEFAULT 5.00,
        api_calls_used   INT           NOT NULL DEFAULT 0,
        api_calls_total  INT           NOT NULL DEFAULT 10000,
        billing_cycle    ENUM('Monthly','Annual') NOT NULL DEFAULT 'Monthly',
        renewal_date     DATE          NOT NULL,
        amount           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await safeAlter(`ALTER TABLE subscriptions MODIFY COLUMN plan VARCHAR(100) NOT NULL DEFAULT 'Starter'`);

    // ── Billing History ────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS billing_history (
        id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        description VARCHAR(255)  NOT NULL,
        amount      DECIMAL(10,2) NOT NULL,
        status      ENUM('Paid','Failed','Pending','Refunded') NOT NULL DEFAULT 'Paid',
        billed_at   DATE          NOT NULL DEFAULT (CURRENT_DATE),
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Setup ─────────────────────────────────────────────────────────────────
await db.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        enterprise_id CHAR(36)     NOT NULL DEFAULT '',
        \`key\`       VARCHAR(100) NOT NULL,
        value         TEXT         NULL,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_enterprise_key (enterprise_id, \`key\`)
      )
    `);
    await safeAlter(`ALTER TABLE company_settings MODIFY COLUMN value LONGTEXT NULL`);
    await safeAlter(`ALTER TABLE company_settings ADD COLUMN enterprise_id CHAR(36) NOT NULL DEFAULT ''`);

    // ── Asset Management ──────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id           CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name         VARCHAR(255)  NOT NULL,
        type         ENUM('Hardware','Software','Furniture','Vehicle','Other') NOT NULL DEFAULT 'Hardware',
        serial_no    VARCHAR(100)  NULL UNIQUE,
        status       ENUM('Available','In Use','Under Repair','Retired') NOT NULL DEFAULT 'Available',
        assigned_to  VARCHAR(255)  NULL,
        purchase_date DATE         NULL,
        value        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL,
        category    VARCHAR(50)  NOT NULL DEFAULT 'General',
        connected   TINYINT(1)   NOT NULL DEFAULT 0,
        color       VARCHAR(20)  NOT NULL DEFAULT '#939BFF',
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── Seed Sales Accounts ───────────────────────────────────────────────────
    const [[{ saCount }]] = await db.query('SELECT COUNT(*) AS saCount FROM sales_accounts');
    if (saCount === 0) {
      const saIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
      await db.query(`
        INSERT INTO sales_accounts (id, name, industry, status, revenue, website, phone, owner) VALUES
          (?, 'Nexus Technologies',  'Technology',    'Active',   850000.00, 'nexustech.io',    '+1 415 555 0101', 'Sarah Chen'),
          (?, 'Vertex Solutions',   'Consulting',    'Active',   420000.00, 'vertexsol.com',   '+1 212 555 0192', 'James Park'),
          (?, 'Aurora Retail Co.',  'Retail',        'Prospect',  95000.00, 'aurora-retail.co','+1 312 555 0183', 'Lisa Ray'),
          (?, 'Pinnacle Finance',   'Finance',       'Churned',  220000.00, 'pinnacle.fin',    '+1 646 555 0174', 'Mark Torres')
      `, saIds);

      await db.query(`
        INSERT INTO sales_contacts (id, account_id, name, email, phone, title, status) VALUES
          (UUID(), ?, 'Emily Carter',  'emily@nexustech.io',   '+1 415 555 0201', 'CTO',              'Active'),
          (UUID(), ?, 'David Liu',     'dliu@vertexsol.com',   '+1 212 555 0202', 'VP Sales',         'Active'),
          (UUID(), ?, 'Sophie Brooks', 'sbrooks@aurora-retail.co', '+1 312 555 0203', 'Procurement Mgr','Active'),
          (UUID(), ?, 'Carlos Mendez', 'cmendez@pinnacle.fin', '+1 646 555 0204', 'CFO',              'Inactive'),
          (UUID(), ?, 'Priya Nair',    'pnair@nexustech.io',   '+1 415 555 0205', 'Product Lead',     'Active')
      `, [saIds[0], saIds[1], saIds[2], saIds[3], saIds[0]]);

      await db.query(`
        INSERT INTO sales_deals (id, account_id, name, stage, value, owner, close_date, probability) VALUES
          (UUID(), ?, 'Enterprise License Q3', 'Proposal',       125000.00, 'Sarah Chen',  '2026-07-30', 60),
          (UUID(), ?, 'Consulting Retainer',   'Negotiation',     48000.00, 'James Park',  '2026-06-15', 80),
          (UUID(), ?, 'Pilot Program',         'Qualification',   18500.00, 'Lisa Ray',    '2026-08-01', 30),
          (UUID(), ?, 'Renewal 2026',          'Closed Lost',     75000.00, 'Mark Torres', '2026-05-01', 0),
          (UUID(), ?, 'Cloud Migration Deal',  'Closed Won',     200000.00, 'Sarah Chen',  '2026-04-30', 100)
      `, [saIds[0], saIds[1], saIds[2], saIds[3], saIds[0]]);

      // ── Seed Extended Sales ─────────────────────────────────────────────────
      await db.query(`
        INSERT INTO sales_proposals (id, proposal_no, account_id, contact_person, valid_until, currency, proposal_type, sales_person, summary, status, amount) VALUES
          (UUID(), 'PROP-2026-001', ?, 'Alice Brown', '2026-06-10', 'USD', 'Standard', 'Sarah Chen', 'Cloud Migration Strategy', 'Open', 15000.00),
          (UUID(), 'PROP-2026-002', ?, 'Bob Smith', '2026-05-20', 'USD', 'Standard', 'James Park', 'Software Maintenance', 'Accepted', 5000.00),
          (UUID(), 'PROP-2026-003', ?, 'Charlie Davis', '2026-06-12', 'USD', 'Standard', 'Lisa Ray', 'Network Overhaul', 'Sent', 25000.00)
      `, [saIds[0], saIds[1], saIds[2]]);

      await db.query(`
        INSERT INTO sales_estimates (id, account_id, estimate_no, status, amount, date, expiry_date) VALUES
          (UUID(), ?, 'EST-2026-001', 'Sent',     1200.00, '2026-05-01', '2026-05-31'),
          (UUID(), ?, 'EST-2026-002', 'Accepted', 3500.00, '2026-04-15', '2026-05-15')
      `, [saIds[0], saIds[1]]);

      const invIds = [uuidv4(), uuidv4()];
      await db.query(`
        INSERT INTO sales_invoices (id, account_id, invoice_no, status, amount, due_amount, date, due_date) VALUES
          (?, ?, 'INV-2026-101', 'Paid',     5000.00,    0.00, '2026-04-01', '2026-04-15'),
          (?, ?, 'INV-2026-102', 'Unpaid',   2500.00, 2500.00, '2026-05-01', '2026-05-15')
      `, [invIds[0], saIds[1], invIds[1], saIds[2]]);

      await db.query(`
        INSERT INTO sales_payments (id, invoice_id, amount, method, date, transaction_id) VALUES
          (UUID(), ?, 5000.00, 'Bank Transfer', '2026-04-05', 'TXN-99887766')
      `, [invIds[0]]);

      await db.query(`
        INSERT INTO sales_credit_notes (id, account_id, note_no, amount, date, reason) VALUES
          (UUID(), ?, 'CN-2026-001', 200.00, '2026-04-10', 'Service adjustment for downtime')
      `, [saIds[0]]);

      await db.query(`
        INSERT INTO sales_items (id, name, description, rate, unit, category, tax_rate) VALUES
          (UUID(), 'Cloud Storage (1TB)', 'Monthly high-speed cloud storage', 99.00, 'mo',  'Cloud',   5.00),
          (UUID(), 'Tech Support (Hourly)', 'Senior developer consulting',    150.00, 'hr',  'Service', 0.00),
          (UUID(), 'Security Audit',      'Full system penetration test',    2500.00, 'pcs', 'Audit',   10.00),
          (UUID(), 'SSL Certificate',     'Annual domain encryption',          49.00, 'yr',  'Security', 0.00)
      `);
    }

    // ── Seed Knowledge Base ───────────────────────────────────────────────────
    const [[{ kbcCount }]] = await db.query('SELECT COUNT(*) AS kbcCount FROM kb_categories');
    if (kbcCount === 0) {
      const catIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
      await db.query(`
        INSERT INTO kb_categories (id, name, icon, color) VALUES
          (?, 'Getting Started', 'Rocket',    '#939BFF'),
          (?, 'Billing',         'Receipt',   '#10b981'),
          (?, 'Integrations',    'Plug',      '#f59e0b'),
          (?, 'Troubleshooting', 'Wrench',    '#ef4444')
      `, catIds);

      await db.query(`
        INSERT INTO kb_articles (id, category_id, title, content, status, author, views) VALUES
          (UUID(), ?, 'How to set up your first project', 'Welcome to Amnoid! This guide walks you through creating your first project from the Dashboard. Click New Project, fill in the details, and assign team members.', 'Published', 'Admin', 342),
          (UUID(), ?, 'Understanding your invoice',       'Every month you receive an invoice by email. You can also download past invoices from Subscriptions → Billing at any time.', 'Published', 'Admin', 218),
          (UUID(), ?, 'Connecting Slack to Amnoid',       'Go to Setup → Integrations and click Connect next to Slack. You will be redirected to Slack''s OAuth screen to authorise the connection.', 'Published', 'Admin', 185),
          (UUID(), ?, 'Why is my data not syncing?',      'If data is not syncing, check that your integration tokens have not expired. Go to Setup → Integrations and reconnect the affected service.', 'Draft',     'Admin', 0),
          (UUID(), ?, 'Invite team members',              'Admins can invite team members from Setup → Users & Roles. Click Invite User, enter their email and role, then send the invitation.', 'Published', 'Admin', 97)
      `, [catIds[0], catIds[1], catIds[2], catIds[3], catIds[0]]);
    }

    // ── Seed Subscription ─────────────────────────────────────────────────────
    const [[{ subCount }]] = await db.query('SELECT COUNT(*) AS subCount FROM subscriptions');
    if (subCount === 0) {
      await db.query(`
        INSERT INTO subscriptions (id, plan, status, seats_used, seats_total, storage_used_gb, storage_total_gb, api_calls_used, api_calls_total, billing_cycle, renewal_date, amount)
        VALUES (UUID(), 'Pro', 'Active', 7, 20, 12.40, 50.00, 38240, 100000, 'Monthly', DATE_ADD(CURRENT_DATE, INTERVAL 18 DAY), 79.00)
      `);
      await db.query(`
        INSERT INTO billing_history (id, description, amount, status, billed_at) VALUES
          (UUID(), 'Pro Plan — April 2026',  79.00, 'Paid',   '2026-04-01'),
          (UUID(), 'Pro Plan — March 2026',  79.00, 'Paid',   '2026-03-01'),
          (UUID(), 'Pro Plan — February 2026',79.00,'Paid',   '2026-02-01'),
          (UUID(), 'Pro Plan — January 2026', 79.00,'Paid',   '2026-01-01')
      `);
    }

    // ── Seed Company Settings ─────────────────────────────────────────────────
    const [[{ csCount }]] = await db.query('SELECT COUNT(*) AS csCount FROM company_settings').catch(() => [[{ csCount: 1 }]]);
if (csCount === 0) {
  await db.query(`
    INSERT INTO company_settings (id, enterprise_id, \`key\`, value) VALUES
      (UUID(), '', 'company_name',     'Amnoid Technologies'),
      (UUID(), '', 'company_email',    'hello@amnoid.io'),
      (UUID(), '', 'company_phone',    '+1 800 AMNOID'),
      (UUID(), '', 'company_website',  'https://amnoid.io'),
      (UUID(), '', 'company_address',  '123 Innovation Drive, San Francisco, CA 94105'),
      (UUID(), '', 'currency',         'USD'),
      (UUID(), '', 'timezone',         'America/Los_Angeles'),
      (UUID(), '', 'date_format',      'MM/DD/YYYY'),
      (UUID(), '', 'notif_new_deal',   'true'),
      (UUID(), '', 'notif_kb_publish', 'true'),
      (UUID(), '', 'notif_billing',    'true'),
      (UUID(), '', 'notif_user_join',  'false')
  `);
}

    // ── Seed Integrations ─────────────────────────────────────────────────────
    const [[{ intCount }]] = await db.query('SELECT COUNT(*) AS intCount FROM integrations');
    if (intCount === 0) {
      await db.query(`
        INSERT INTO integrations (id, name, slug, description, category, connected, color) VALUES
          (UUID(), 'Slack',      'slack',      'Real-time team notifications and alerts.',          'Communication', 1, '#4A154B'),
          (UUID(), 'Stripe',     'stripe',     'Payment processing and subscription billing.',      'Billing',       1, '#635BFF'),
          (UUID(), 'Salesforce', 'salesforce', 'Sync CRM accounts, contacts and opportunities.',   'CRM',           0, '#00A1E0'),
          (UUID(), 'Google Analytics','google-analytics','Track website and app user behaviour.','Analytics',    1, '#E37400'),
          (UUID(), 'Mailchimp',  'mailchimp',  'Email campaign management and automation.',         'Marketing',     0, '#FFE01B'),
          (UUID(), 'Zapier',     'zapier',     'Connect 5,000+ apps with no-code automation.',     'Automation',    0, '#FF4A00')
      `);
    }


    // ── Seed Extended Marketing ───────────────────────────────────────────────
    const [[{ infCount }]] = await db.query('SELECT COUNT(*) AS infCount FROM marketing_influencers');
    if (infCount === 0) {
      await db.query(`
        INSERT INTO marketing_influencers (id, name, platform, handle, followers, niche, status, budget) VALUES
          (UUID(), 'Alex Rivera',   'Instagram', '@alex_tech',  125000, 'Technology', 'Active',      2500.00),
          (UUID(), 'Sarah Jenkins', 'YouTube',   'SarahVlogs',  450000, 'Lifestyle',  'Negotiating', 5000.00),
          (UUID(), 'Mike Chen',     'TikTok',    '@mike_cooks', 890000, 'Food',       'Completed',   1200.00)
      `);
    }

    const [[{ fieldCount }]] = await db.query('SELECT COUNT(*) AS fieldCount FROM marketing_field_events');
    if (fieldCount === 0) {
      await db.query(`
        INSERT INTO marketing_field_events (id, name, location, type, status, budget, leads_target, date) VALUES
          (UUID(), 'TechCrunch Disrupt', 'San Francisco', 'Conference', 'Confirmed', 15000.00, 500, '2026-09-15'),
          (UUID(), 'Global Retail Expo', 'Las Vegas',     'Trade Show', 'Planning',  8000.00,  300, '2026-11-20'),
          (UUID(), 'Developer Meetup',   'New York',      'Meetup',     'Ongoing',   500.00,   50,  '2026-05-13')
      `);
    }

    // ── Seed Assets ──────────────────────────────────────────────────────────
    const [[{ assetCount }]] = await db.query('SELECT COUNT(*) AS assetCount FROM assets');
    if (assetCount === 0) {
      await db.query(`
        INSERT INTO assets (id, name, type, serial_no, status, assigned_to, purchase_date, value) VALUES
          (UUID(), 'MacBook Pro 16\"', 'Hardware', 'SN-MBP-2026-01', 'In Use',    'Sarah Chen', '2026-01-15', 2499.00),
          (UUID(), 'Dell UltraSharp 27\"', 'Hardware', 'SN-MON-2026-05', 'Available', NULL,         '2026-03-10', 599.00),
          (UUID(), 'Adobe Creative Cloud', 'Software', 'LIC-ADOBE-9988', 'In Use',    'James Park', '2026-01-01', 59.99),
          (UUID(), 'Ergonomic Desk Chair', 'Furniture', 'SN-FUR-2026-12', 'In Use',    'Lisa Ray',   '2026-02-20', 450.00)
      `);
    }
    // ── Activities ────────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        user_id    CHAR(36)     NULL,
        type       VARCHAR(50)  NOT NULL,
        message    TEXT         NOT NULL,
        module     VARCHAR(50)  NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Apply tenant columns only after every table has been created. The
    // earlier compatibility alters run before some CREATE TABLE statements;
    // on a fresh database they are ignored because the table does not yet
    // exist. This ensures existing installations receive the missing columns
    // on the next start.
    const tenantTables = [
      'users', 'projects', 'tasks', 'employees', 'leaves', 'attendance',
      'campaigns', 'leads', 'invoices', 'expenses', 'transactions',
      'calendar_events', 'kanban_cards', 'files', 'faq', 'email_campaigns',
      'email_templates', 'social_posts', 'marketing_influencers',
      'marketing_field_events', 'custom_reports', 'hr_announcements',
      'hr_trainings', 'hr_awards', 'sales_accounts', 'sales_contacts',
      'sales_deals', 'sales_proposals', 'sales_estimates', 'sales_invoices',
      'sales_payments', 'sales_credit_notes', 'sales_items', 'kb_categories',
      'kb_articles', 'assets', 'activities'
    ];

    for (const table of tenantTables) {
      const [columns] = await db.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'enterprise_id'`,
        [table]
      );
      if (columns.length === 0) {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN enterprise_id CHAR(36) NULL`);
      }
    }

    // Removed sales_proposals and sales_proposal_items from here and moved to top

    const [[{ actCount }]] = await db.query('SELECT COUNT(*) AS actCount FROM activities');
    if (actCount === 0) {
      await db.query(`
        INSERT INTO activities (id, type, message, module) VALUES
          (UUID(), 'invoice',  'Invoice INV-2026-101 paid by Vertex Solutions', 'Sales'),
          (UUID(), 'deal',     'New deal "Enterprise License Q3" created for Nexus Tech', 'Sales'),
          (UUID(), 'employee', 'New employee Carol White joined Design team', 'HR'),
          (UUID(), 'project',  'Project "Cloud Migration" moved to In Progress', 'Projects'),
          (UUID(), 'task',     'Task "API endpoint design" completed by Sarah Chen', 'Projects')
      `);
    }
    // ── Webhooks ──────────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        enterprise_id CHAR(36)     NULL,
        name          VARCHAR(255) NOT NULL,
        url           TEXT         NOT NULL,
        secret        VARCHAR(255) NULL,
        events        JSON         NOT NULL DEFAULT ('[]'),
        is_active     TINYINT(1)   NOT NULL DEFAULT 1,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id              CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        webhook_id      CHAR(36)     NOT NULL,
        enterprise_id   CHAR(36)     NULL,
        event           VARCHAR(100) NOT NULL,
        payload         JSON         NULL,
        response_status INT          NULL,
        response_body   TEXT         NULL,
        is_success      TINYINT(1)   NOT NULL DEFAULT 0,
        duration_ms     INT          NOT NULL DEFAULT 0,
        created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
      )
    `);

    // ── Super Admin (upsert on every startup from .env) ──────────────────────
    const bcrypt      = require('bcryptjs');
    const SA_EMAIL    = process.env.SUPERADMIN_EMAIL    || 'aminodtaijjas@gmail.com';
    const SA_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Taij@#!$2026Taij';
    const hashed      = await bcrypt.hash(SA_PASSWORD, 10);
    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
    );
    if (existing) {
      await db.query(
        'UPDATE users SET email = ?, password = ? WHERE role = ?',
        [SA_EMAIL, hashed, 'super_admin']
      );
    } else {
      await db.query(
        `INSERT INTO users (id, first_name, last_name, email, password, role, subscription_status, kyc_status)
         VALUES (UUID(), 'Super', 'Admin', ?, ?, 'super_admin', 'ACTIVE', 'APPROVED')`,
        [SA_EMAIL, hashed]
      );
    }
    console.log(`👑 Super admin ready → ${SA_EMAIL}`);

    console.log('✅ Database migrations applied');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
};

module.exports = run;

if (require.main === module) {
  run().then(() => process.exit(0)).catch(() => process.exit(1));
}