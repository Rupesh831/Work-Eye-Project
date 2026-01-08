"""
PostgreSQL Database Initialization Script for Work-Eye
Compatible with Python 3.13 - uses psycopg version 3 ONLY
NO PSYCOPG2 - COMPLETELY REMOVED
"""
import os
import sys

print("\n" + "="*70)
print("🔧 Work-Eye PostgreSQL Database Initialization")
print("="*70)

# FORCE psycopg3 installation and remove psycopg2
try:
    # First, try to uninstall psycopg2 if it exists
    import subprocess
    print("\n🔧 Removing psycopg2 if present...")
    subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "psycopg2", "psycopg2-binary"], 
                   capture_output=True)
    print("✅ Cleaned up old psycopg2")
except:
    pass

# Now install and import psycopg (v3)
try:
    import psycopg
    print("✅ psycopg (v3) already installed")
except ImportError:
    print("\n⚠️  psycopg not found, installing psycopg[binary]...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--force-reinstall", "psycopg[binary]==3.1.18"])
    import psycopg
    print("✅ psycopg[binary] installed successfully")

# Your Render PostgreSQL credentials
DATABASE_URL = "postgresql://work_eye_db_user:DeXsKDcQNO6rpdQypAjDECEjqRXVa8hr@dpg-d52ij3ali9vc73f8tn40-a/work_eye_db"

# Also check environment
ENV_URL = os.environ.get('DATABASE_URL')
if ENV_URL:
    if ENV_URL.startswith('postgres://'):
        ENV_URL = ENV_URL.replace('postgres://', 'postgresql://', 1)
    DATABASE_URL = ENV_URL
    print("✅ Using DATABASE_URL from environment")
else:
    print("✅ Using hardcoded database credentials")

print(f"\n📊 Connecting to database...")
print(f"   Host: dpg-d52ij3ali9vc73f8tn40-a")
print(f"   Database: work_eye_db")
print(f"   User: work_eye_db_user")

try:
    conn = psycopg.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("✅ Connected successfully!")
    
    # Check existing tables
    cursor.execute("""
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN 
        ('devices', 'raw_activity_log', 'processed_data', 'app_usage', 'website_visits', 'daily_summaries', 'members', 'punch_logs')
    """)
    existing_count = cursor.fetchone()[0]
    
    if existing_count > 0:
        print(f"\n⚠️  Found {existing_count} existing tables")
        print("Dropping and recreating automatically...")
        
        tables_to_drop = ['punch_logs', 'raw_activity_log', 'processed_data', 'app_usage', 
                         'website_visits', 'daily_summaries', 'members', 'devices']
        
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                print(f"   ✅ Dropped: {table}")
            except Exception as e:
                print(f"   ⚠️  {table}: {e}")
    
    print("\n📝 Creating tables...")
    
    # TABLE 1: devices
    cursor.execute("""
        CREATE TABLE devices (
            device_id VARCHAR(255) PRIMARY KEY,
            user_name VARCHAR(255) NOT NULL,
            hostname VARCHAR(255),
            os_info VARCHAR(255),
            status VARCHAR(50) DEFAULT 'offline',
            is_idle BOOLEAN DEFAULT FALSE,
            locked BOOLEAN DEFAULT FALSE,
            current_window TEXT,
            current_process VARCHAR(255),
            live_metrics JSONB DEFAULT '{}',
            last_seen TIMESTAMP,
            last_activity TIMESTAMP,
            session_start TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("   ✅ devices")
    
    # TABLE 2: raw_activity_log
    cursor.execute("""
        CREATE TABLE raw_activity_log (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            session_start TIMESTAMP,
            total_seconds NUMERIC(12, 2) DEFAULT 0,
            active_seconds NUMERIC(12, 2) DEFAULT 0,
            idle_seconds NUMERIC(12, 2) DEFAULT 0,
            locked_seconds NUMERIC(12, 2) DEFAULT 0,
            idle_for NUMERIC(10, 2) DEFAULT 0,
            current_window TEXT,
            current_process VARCHAR(255),
            is_idle BOOLEAN DEFAULT FALSE,
            locked BOOLEAN DEFAULT FALSE,
            mouse_active BOOLEAN DEFAULT FALSE,
            keyboard_active BOOLEAN DEFAULT FALSE,
            windows_opened JSONB DEFAULT '[]',
            browser_history JSONB DEFAULT '[]',
            raw_payload JSONB DEFAULT '{}',
            screenshot TEXT,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        )
    """)
    print("   ✅ raw_activity_log")
    
    # TABLE 3: processed_data
    cursor.execute("""
        CREATE TABLE processed_data (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            current_window TEXT,
            current_process VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            is_idle BOOLEAN DEFAULT FALSE,
            locked BOOLEAN DEFAULT FALSE,
            screenshot TEXT,
            active_duration NUMERIC(10, 2) DEFAULT 0,
            idle_duration NUMERIC(10, 2) DEFAULT 0,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        )
    """)
    print("   ✅ processed_data")
    
    # TABLE 4: app_usage
    cursor.execute("""
        CREATE TABLE app_usage (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            app_name VARCHAR(255),
            window_title TEXT,
            process_name VARCHAR(255),
            total_time_seconds NUMERIC(12, 2) DEFAULT 0,
            active_time_seconds NUMERIC(12, 2) DEFAULT 0,
            idle_time_seconds NUMERIC(12, 2) DEFAULT 0,
            visit_count INTEGER DEFAULT 1,
            category VARCHAR(100),
            productivity_score NUMERIC(3, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
            UNIQUE(device_id, date, app_name, window_title)
        )
    """)
    print("   ✅ app_usage")
    
    # TABLE 5: website_visits
    cursor.execute("""
        CREATE TABLE website_visits (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            url TEXT,
            domain VARCHAR(255),
            page_title TEXT,
            browser VARCHAR(100),
            visit_count INTEGER DEFAULT 1,
            total_time_seconds NUMERIC(12, 2) DEFAULT 0,
            first_visit TIMESTAMP,
            last_visit TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        )
    """)
    print("   ✅ website_visits")
    
    # TABLE 6: daily_summaries
    cursor.execute("""
        CREATE TABLE daily_summaries (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            user_name VARCHAR(255),
            total_screen_time NUMERIC(8, 2) DEFAULT 0,
            active_time NUMERIC(8, 2) DEFAULT 0,
            idle_time NUMERIC(8, 2) DEFAULT 0,
            locked_time NUMERIC(8, 2) DEFAULT 0,
            productivity_percentage NUMERIC(5, 2) DEFAULT 0,
            efficiency_percentage NUMERIC(5, 2) DEFAULT 0,
            unique_apps_used INTEGER DEFAULT 0,
            window_switches INTEGER DEFAULT 0,
            websites_visited INTEGER DEFAULT 0,
            screenshots_captured INTEGER DEFAULT 0,
            first_activity TIMESTAMP,
            last_activity TIMESTAMP,
            total_sessions INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
            UNIQUE(device_id, date)
        )
    """)
    print("   ✅ daily_summaries")
    
    # TABLE 7: members (for employee/member management)
    cursor.execute("""
        CREATE TABLE members (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            employee_id VARCHAR(100),
            department VARCHAR(255),
            position VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            is_active BOOLEAN DEFAULT TRUE,
            last_punch_in TIMESTAMP,
            last_punch_out TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("   ✅ members")
    
    # TABLE 8: punch_logs (for tracking punch in/out)
    cursor.execute("""
        CREATE TABLE punch_logs (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL,
            email VARCHAR(255) NOT NULL,
            action VARCHAR(20) NOT NULL,
            device_id VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration_minutes INTEGER,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )
    """)
    print("   ✅ punch_logs")
    
    # CREATE INDEXES
    print("\n🚀 Creating indexes...")
    
    indexes = [
        ("idx_devices_status", "devices(status)"),
        ("idx_devices_last_seen", "devices(last_seen DESC)"),
        ("idx_raw_activity_device", "raw_activity_log(device_id)"),
        ("idx_raw_activity_timestamp", "raw_activity_log(timestamp DESC)"),
        ("idx_processed_device", "processed_data(device_id)"),
        ("idx_processed_timestamp", "processed_data(timestamp DESC)"),
        ("idx_app_usage_device_date", "app_usage(device_id, date DESC)"),
        ("idx_daily_device_date", "daily_summaries(device_id, date DESC)"),
        ("idx_members_email", "members(email)"),
        ("idx_members_status", "members(status, is_active)"),
        ("idx_punch_logs_member", "punch_logs(member_id, timestamp DESC)"),
        ("idx_punch_logs_email", "punch_logs(email, timestamp DESC)"),
    ]
    
    for idx_name, idx_def in indexes:
        cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
    print(f"   ✅ Created {len(indexes)} indexes")
    
    # Partial index for screenshots
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processed_screenshots 
        ON processed_data(device_id, timestamp DESC) 
        WHERE screenshot IS NOT NULL
    """)
    print("   ✅ Screenshot index (partial)")
    
    # VERIFY
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' ORDER BY table_name
    """)
    tables = cursor.fetchall()
    
    print("\n📋 Tables created:")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"   ✅ {table[0]}: {count} rows")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*70)
    print("✅ DATABASE INITIALIZATION COMPLETED!")
    print("="*70)
    print("\n🎉 Your database is ready!")
    print("\nNext: Deploy your backend and start tracking!")
    print("="*70 + "\n")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
