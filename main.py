"""
MAIN DATA PROCESSOR - Enhanced Version (PostgreSQL)
Fully compatible with work_eye_tracker.py and new database schema

Receives comprehensive tracker data and stores in optimized schema:
- devices: Live device status and metrics
- raw_activity_log: Complete raw data from tracker
- processed_data: Timeline view with screenshots
- app_usage, website_visits, daily_summaries: Aggregated analytics
"""
from flask import request, jsonify
from datetime import datetime, timedelta
import psycopg
from psycopg.rows import dict_row
import json as json_module
import os
import sys
import traceback
from collections import defaultdict
import json

# Load name mappings
def load_name_map():
    mapping = {}
    try:
        if os.path.exists("name_map.txt"):
            with open("name_map.txt", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if ">" in line and len(line.split(">", 1)) == 2:
                        a, b = line.split(">", 1)
                        mapping[a.strip()] = b.strip()
            print(f"📁 Loaded {len(mapping)} name mappings")
    except Exception as e:
        print(f"❌ Error reading name_map.txt: {e}")
    return mapping

NAME_MAP = load_name_map()

def resolve_name(raw_username):
    """Safely resolve username with fallback"""
    if not raw_username:
        return "Unknown"
    return NAME_MAP.get(raw_username, raw_username)

print("\n" + "="*70)
print("🔄 MAIN PROCESSOR - Enhanced PostgreSQL Version")
print("="*70)

# PostgreSQL Connection
DATABASE_URL = os.environ.get('DATABASE_URL')

# Fallback to hardcoded database URL if environment variable not set
if not DATABASE_URL:
    print("⚠️  DATABASE_URL not in environment, using fallback credentials")
    DATABASE_URL = "postgresql://work_eye_db_user:DeXsKDcQNO6rpdQypAjDECEjqRXVa8hr@dpg-d52ij3ali9vc73f8tn40-a/work_eye_db"

# Fix for Render's postgres:// to postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

print("🔄 Connecting to PostgreSQL...")

DB_OK = False
try:
    test_conn = psycopg.connect(DATABASE_URL, sslmode='require')
    test_conn.close()
    print("✅ PostgreSQL CONNECTED!")
    DB_OK = True
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    DB_OK = False

print("="*70 + "\n")

def get_db_connection():
    """Get a fresh database connection"""
    if not DB_OK:
        return None
    try:
        conn = psycopg.connect(DATABASE_URL, sslmode='require')
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"❌ Failed to get DB connection: {e}")
        return None

def check_db_connection():
    """Verify database connection is active"""
    if not DB_OK:
        return False
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return True
    except:
        return False

def calculate_metrics(active_seconds, idle_seconds, total_seconds):
    """Calculate metrics from accumulated seconds"""
    try:
        active_seconds = float(active_seconds) if active_seconds is not None else 0
        idle_seconds = float(idle_seconds) if idle_seconds is not None else 0
        total_seconds = float(total_seconds) if total_seconds is not None else 0
        
        active_seconds = max(0, active_seconds)
        idle_seconds = max(0, idle_seconds)
        total_seconds = max(0, total_seconds)
        
        screen_time_hours = round(total_seconds / 3600, 2)
        active_time_hours = round(active_seconds / 3600, 2)
        idle_time_hours = round(idle_seconds / 3600, 2)
        
        productivity = round((active_seconds / total_seconds * 100) if total_seconds > 0 else 0, 1)
        efficiency = round(max(0, 100 - (idle_seconds / total_seconds * 100)) if total_seconds > 0 else 0, 1)
        
        productivity = max(0, min(100, productivity))
        efficiency = max(0, min(100, efficiency))
        
        return {
            'screen_time_hours': screen_time_hours,
            'active_time_hours': active_time_hours,
            'idle_time_hours': idle_time_hours,
            'total_idle_hours': idle_time_hours,
            'productivity': productivity,
            'efficiency': efficiency
        }
    except Exception as e:
        print(f"⚠️ Error calculating metrics: {e}")
        return {
            'screen_time_hours': 0,
            'active_time_hours': 0,
            'idle_time_hours': 0,
            'total_idle_hours': 0,
            'productivity': 0,
            'efficiency': 0
        }

def parse_iso_timestamp(timestamp_str):
    """Parse ISO timestamp safely"""
    if not timestamp_str:
        return datetime.now()
    try:
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except:
        return datetime.now()

def home():
    """Health check"""
    db_status = check_db_connection()
    return jsonify({
        "status": "online",
        "service": "Work-Eye Backend - Enhanced PostgreSQL",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.now().isoformat()
    })

def test():
    """Test endpoint"""
    return jsonify({
        "success": True,
        "message": "Backend is running with Enhanced PostgreSQL",
        "db_ok": check_db_connection()
    })

def register_device():
    """Register a device"""
    if not check_db_connection():
        return jsonify({
            "status": "error",
            "message": "Database not connected"
        }), 503
    
    try:
        data = request.json or {}
        device_id = data.get('device_id') or data.get('hostname')
        username = data.get('username') or data.get('user', 'Unknown')
        hostname = data.get('hostname', device_id)
        os_info = data.get('os_info', 'Unknown')
        
        if not device_id:
            return jsonify({
                "status": "error",
                "message": "device_id required"
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "status": "error",
                "message": "Database connection failed"
            }), 503
        
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO devices (
                device_id, user_name, hostname, os_info, 
                status, last_seen, session_start, created_at
            )
            VALUES (%s, %s, %s, %s, 'online', %s, %s, %s)
            ON CONFLICT (device_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                hostname = EXCLUDED.hostname,
                os_info = EXCLUDED.os_info,
                last_seen = EXCLUDED.last_seen,
                session_start = EXCLUDED.session_start,
                status = 'online',
                updated_at = CURRENT_TIMESTAMP
        """, (
            device_id, 
            resolve_name(username), 
            hostname,
            os_info,
            datetime.now(), 
            datetime.now(),
            datetime.now()
        ))
        
        cursor.close()
        conn.close()
        
        print(f"✅ Device registered: {device_id} ({username})")
        return jsonify({
            "status": "success",
            "message": "Device registered",
            "device_id": device_id
        })
    
    except Exception as e:
        print(f"❌ REGISTRATION ERROR: {e}")
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def upload_activity():
    """Upload activity data - COMPLETE ENHANCED VERSION"""
    if not check_db_connection():
        return jsonify({
            "success": False,
            "error": "Database not connected"
        }), 503
    
    try:
        event = request.json or {}
        device_id = event.get("device_id")
        
        if not device_id:
            return jsonify({
                "success": False,
                "error": "device_id required"
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 503
        
        cursor = conn.cursor()
        
        # ====================================================================
        # SECURITY CHECK: Verify email/member before accepting ANY data
        # ====================================================================
        
        email = event.get("email", "").lower().strip()
        
        # If no email provided, reject
        if not email:
            cursor.close()
            conn.close()
            print(f"🚫 REJECTED: No email provided - device_id: {device_id}")
            return jsonify({
                "success": False,
                "error": "Email required for tracking"
            }), 400
        
        # CRITICAL: Check if email exists in members table and is active
        try:
            cursor.execute("""
                SELECT id, email, full_name, is_active, status
                FROM members
                WHERE LOWER(email) = %s
            """, (email,))
            
            member = cursor.fetchone()
            
            if not member:
                # Email not verified - REJECT DATA
                cursor.close()
                conn.close()
                print(f"🚫 REJECTED: Email not verified - {email}")
                return jsonify({
                    "success": False,
                    "error": "Email not verified. Please contact administrator."
                }), 403
            
            # Check if member is active
            member_id, member_email, member_name, is_active, status = member
            
            if not is_active or status != 'active':
                # Member inactive - REJECT DATA
                cursor.close()
                conn.close()
                print(f"🚫 REJECTED: Member inactive - {email}")
                return jsonify({
                    "success": False,
                    "error": "Member account inactive. Please contact administrator."
                }), 403
            
            # ✅ VERIFIED MEMBER - Accept data
            print(f"✅ VERIFIED: {member_name} ({email}) - device: {device_id}")
            
        except Exception as e:
            print(f"❌ Verification error: {e}")
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "error": "Verification failed"
            }), 500
        
        
        # ====================================================================
        # EXTRACT ALL DATA FROM TRACKER
        # ====================================================================
        
        # Time metrics
        total_seconds = float(event.get("total_seconds", 0))
        active_seconds = float(event.get("active_seconds", 0))
        idle_seconds = float(event.get("idle_seconds", 0))
        locked_seconds = float(event.get("locked_seconds", 0))
        idle_for = float(event.get("idle_for", 0))
        
        # State
        is_idle = event.get("is_idle", False)
        is_locked = event.get("locked", False)
        mouse_active = event.get("mouse_active", False)
        keyboard_active = event.get("keyboard_active", False)
        
        # Current activity
        current_window = event.get("current_window", "")
        current_process = event.get("current_process", "")
        
        # Tracking data
        windows_opened = event.get("windows_opened", [])
        browser_history = event.get("browser_history", [])
        
        # Timestamps
        session_start = parse_iso_timestamp(event.get("session_start"))
        timestamp = parse_iso_timestamp(event.get("timestamp"))
        last_activity = parse_iso_timestamp(event.get("last_activity"))
        
        # User
        # Use verified member info
        username = member_email  # Use verified email as username
        
        # Screenshot
        screenshot_b64 = event.get("screenshot")
        
        # ====================================================================
        # 1. STORE RAW ACTIVITY LOG (complete tracker data)
        # ====================================================================
        
        try:
            cursor.execute("""
                INSERT INTO raw_activity_log (
                    device_id, user_name, timestamp, session_start,
                    total_seconds, active_seconds, idle_seconds, locked_seconds, idle_for,
                    current_window, current_process,
                    is_idle, locked, mouse_active, keyboard_active,
                    windows_opened, browser_history, raw_payload, screenshot
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                device_id, username, timestamp, session_start,
                total_seconds, active_seconds, idle_seconds, locked_seconds, idle_for,
                current_window, current_process,
                is_idle, is_locked, mouse_active, keyboard_active,
                json_module.dumps(windows_opened), json_module.dumps(browser_history), json_module.dumps(event), screenshot_b64
            ))
            # print(f"✅ Raw activity stored for {device_id}")
        except Exception as e:
            print(f"⚠️ Error storing raw activity: {e}")
        
        # ====================================================================
        # 2. STORE PROCESSED DATA (timeline view)
        # ====================================================================
        
        # Only store if there's meaningful activity or a screenshot
        if screenshot_b64 or current_window or not is_idle:
            try:
                cursor.execute("""
                    INSERT INTO processed_data (
                        device_id, user_name, timestamp,
                        current_window, current_process,
                        status, is_idle, locked, screenshot,
                        active_duration, idle_duration
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    device_id, username, timestamp,
                    current_window, current_process,
                    'active' if not is_idle and not is_locked else 'idle',
                    is_idle, is_locked, screenshot_b64,
                    active_seconds, idle_seconds
                ))
                
                if screenshot_b64:
                    print(f"📸 Screenshot saved for {device_id}")
            except Exception as e:
                print(f"⚠️ Error storing processed data: {e}")
        
        # ====================================================================
        # 3. UPDATE APP USAGE (if we have process info)
        # ====================================================================
        
        if current_process and total_seconds > 0:
            try:
                today = datetime.now().date()
                cursor.execute("""
                    INSERT INTO app_usage (
                        device_id, date, app_name, window_title, process_name,
                        total_time_seconds, active_time_seconds, idle_time_seconds, visit_count
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)
                    ON CONFLICT (device_id, date, app_name, window_title) DO UPDATE SET
                        total_time_seconds = app_usage.total_time_seconds + EXCLUDED.total_time_seconds,
                        active_time_seconds = app_usage.active_time_seconds + EXCLUDED.active_time_seconds,
                        idle_time_seconds = app_usage.idle_time_seconds + EXCLUDED.idle_time_seconds,
                        visit_count = app_usage.visit_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    device_id, today, current_process[:255], current_window[:255], current_process[:255],
                    total_seconds, active_seconds, idle_seconds
                ))
            except Exception as e:
                print(f"⚠️ Error updating app usage: {e}")
        
        # ====================================================================
        # 4. UPDATE DAILY SUMMARY
        # ====================================================================
        
        try:
            today = datetime.now().date()
            metrics = calculate_metrics(active_seconds, idle_seconds, total_seconds)
            
            cursor.execute("""
                INSERT INTO daily_summaries (
                    device_id, date, user_name,
                    total_screen_time, active_time, idle_time, locked_time,
                    productivity_percentage, efficiency_percentage,
                    unique_apps_used, window_switches, websites_visited,
                    first_activity, last_activity
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (device_id, date) DO UPDATE SET
                    total_screen_time = daily_summaries.total_screen_time + EXCLUDED.total_screen_time,
                    active_time = daily_summaries.active_time + EXCLUDED.active_time,
                    idle_time = daily_summaries.idle_time + EXCLUDED.idle_time,
                    locked_time = daily_summaries.locked_time + EXCLUDED.locked_time,
                    productivity_percentage = EXCLUDED.productivity_percentage,
                    efficiency_percentage = EXCLUDED.efficiency_percentage,
                    unique_apps_used = (
                        SELECT COUNT(DISTINCT app_name) 
                        FROM app_usage 
                        WHERE device_id = EXCLUDED.device_id AND date = EXCLUDED.date
                    ),
                    window_switches = daily_summaries.window_switches + 1,
                    last_activity = EXCLUDED.last_activity,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                device_id, today, username,
                metrics['screen_time_hours'], metrics['active_time_hours'], 
                metrics['idle_time_hours'], locked_seconds / 3600,
                metrics['productivity'], metrics['efficiency'],
                len(set([w.split('||')[0] for w in windows_opened])),  # unique apps
                len(windows_opened),  # window switches
                len(browser_history),  # websites
                session_start, last_activity
            ))
        except Exception as e:
            print(f"⚠️ Error updating daily summary: {e}")
        
        # ====================================================================
        # 5. UPDATE DEVICE STATUS (live metrics)
        # ====================================================================
        
        metrics = calculate_metrics(active_seconds, idle_seconds, total_seconds)
        metrics['session_start'] = session_start.isoformat()
        metrics['mouse_active'] = mouse_active
        metrics['keyboard_active'] = keyboard_active
        metrics['idle_for_seconds'] = idle_for
        metrics['locked_seconds'] = locked_seconds
        metrics['windows_opened_count'] = len(windows_opened)
        metrics['browser_sessions'] = len(browser_history)
        metrics['last_updated'] = datetime.now().isoformat()
        
        cursor.execute("""
            UPDATE devices SET
                user_name = %s,
                live_metrics = %s,
                last_seen = %s,
                last_activity = %s,
                session_start = %s,
                status = 'online',
                current_window = %s,
                current_process = %s,
                is_idle = %s,
                locked = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE device_id = %s
        """, (
            username, json_module.dumps(metrics),
            datetime.now(), last_activity, session_start,
            current_window, current_process,
            is_idle, is_locked,
            device_id
        ))
        
        # Auto-register if device doesn't exist
        if cursor.rowcount == 0:
            print(f"ℹ️ Auto-registering device: {device_id}")
            cursor.execute("""
                INSERT INTO devices (
                    device_id, user_name, live_metrics, last_seen, last_activity,
                    session_start, status, current_window, current_process,
                    is_idle, locked, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                device_id, username, json_module.dumps(metrics),
                datetime.now(), last_activity, session_start,
                'online', current_window, current_process,
                is_idle, is_locked, datetime.now()
            ))
        
        cursor.close()
        conn.close()
        
        # ====================================================================
        # LOGGING
        # ====================================================================
        
        status_emoji = "🟢" if not is_idle and not is_locked else "🟡" if is_idle else "🔴"
        screenshot_status = " 📸" if screenshot_b64 else ""
        print(f"{status_emoji} {device_id} ({username}): "
              f"{metrics['screen_time_hours']:.2f}h total | "
              f"{metrics['active_time_hours']:.2f}h active | "
              f"{metrics['productivity']:.0f}% productive | "
              f"{current_process}{screenshot_status}")
        
        return jsonify({"success": True}), 200
    
    except Exception as e:
        print(f"❌ UPLOAD ERROR: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
