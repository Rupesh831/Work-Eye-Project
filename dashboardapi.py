"""
Dashboard API - Enhanced Version (PostgreSQL)
Compatible with new database schema

Endpoints:
- GET  /api/employees - List all devices with live metrics
- GET  /api/employee/<device_id> - Get single device details
- GET  /api/stats - Overall statistics
- GET  /api/activity - Recent activity across all devices
- GET  /api/activity-log - Paginated activity log
- GET  /api/screenshots/<device_id> - Get screenshots for device
- POST /api/device/heartbeat - Update device heartbeat
"""
from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import psycopg
from psycopg.rows import dict_row
import os
import sys

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')

DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Fallback to hardcoded database URL
if not DATABASE_URL:
    DATABASE_URL = "postgresql://work_eye_db_user:DeXsKDcQNO6rpdQypAjDECEjqRXVa8hr@dpg-d52ij3ali9vc73f8tn40-a/work_eye_db"

if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

def get_db():
    """Get database connection"""
    try:
        conn = psycopg.connect(DATABASE_URL, sslmode='require')
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

# ============================================================================
# EMPLOYEES LIST
# ============================================================================

@dashboard_bp.route('/employees', methods=['GET'])
def get_employees():
    """Get all devices with live metrics"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Get all devices with their live metrics
        # ONLY for verified members (user_name must match an email in members table)
        cursor.execute("""
            SELECT 
                d.device_id,
                d.user_name,
                d.hostname,
                d.status,
                d.is_idle,
                d.locked,
                d.current_window,
                d.current_process,
                d.live_metrics,
                d.last_seen,
                d.last_activity,
                d.session_start,
                d.created_at,
                m.full_name,
                m.id as member_id
            FROM devices d
            INNER JOIN members m ON LOWER(d.user_name) = LOWER(m.email)
            WHERE m.is_active = TRUE AND m.status = 'active'
            ORDER BY d.last_seen DESC NULLS LAST
        """)
        
        devices = cursor.fetchall()
        
        # Process devices
        employees = []
        for device in devices:
            # Determine status
            last_seen = device['last_seen']
            if last_seen:
                time_since_seen = (datetime.now() - last_seen).total_seconds()
                if time_since_seen > 300:  # 5 minutes
                    status = 'offline'
                elif device['locked']:
                    status = 'locked'
                elif device['is_idle']:
                    status = 'idle'
                else:
                    status = 'active'
            else:
                status = 'offline'
            
            # Get metrics
            metrics = device['live_metrics'] or {}
            
            # Calculate session duration
            session_duration_hours = 0
            if device['session_start'] and status != 'offline':
                session_seconds = (datetime.now() - device['session_start']).total_seconds()
                session_duration_hours = round(session_seconds / 3600, 2)
            
            employee = {
                'device_id': device['device_id'],
                'name': device.get('full_name') or device['user_name'] or 'Unknown',
                'email': device['user_name'],
                'hostname': device['hostname'],
                'status': status,
                'is_idle': device['is_idle'],
                'locked': device['locked'],
                
                # Current activity
                'current_activity': {
                    'window': device['current_window'],
                    'process': device['current_process'],
                },
                
                # Metrics
                'screen_time_hours': metrics.get('screen_time_hours', 0),
                'active_time_hours': metrics.get('active_time_hours', 0),
                'idle_time_hours': metrics.get('idle_time_hours', 0),
                'productivity': metrics.get('productivity', 0),
                'efficiency': metrics.get('efficiency', 0),
                'session_duration_hours': session_duration_hours,
                
                # Timestamps
                'last_seen': last_seen.isoformat() if last_seen else None,
                'last_activity': device['last_activity'].isoformat() if device['last_activity'] else None,
                'session_start': device['session_start'].isoformat() if device['session_start'] else None,
            }
            
            employees.append(employee)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'employees': employees,
            'total_count': len(employees),
            'active_count': sum(1 for e in employees if e['status'] == 'active'),
            'idle_count': sum(1 for e in employees if e['status'] == 'idle'),
            'offline_count': sum(1 for e in employees if e['status'] == 'offline'),
        })
    
    except Exception as e:
        print(f"❌ Error in get_employees: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# EMPLOYEE DETAIL
# ============================================================================

@dashboard_bp.route('/employee/<device_id>', methods=['GET'])
def get_employee_detail(device_id):
    """Get detailed info for a specific device"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Get device info
        cursor.execute("""
            SELECT * FROM devices WHERE device_id = %s
        """, (device_id,))
        
        device = cursor.fetchone()
        if not device:
            cursor.close()
            conn.close()
            return jsonify({"error": "Device not found"}), 404
        
        # Get today's daily summary
        today = datetime.now().date()
        cursor.execute("""
            SELECT * FROM daily_summaries 
            WHERE device_id = %s AND date = %s
        """, (device_id, today))
        
        daily_summary = cursor.fetchone()
        
        # Get recent app usage (today)
        cursor.execute("""
            SELECT 
                app_name,
                SUM(total_time_seconds) as total_seconds,
                SUM(visit_count) as visits
            FROM app_usage
            WHERE device_id = %s AND date = %s
            GROUP BY app_name
            ORDER BY total_seconds DESC
            LIMIT 10
        """, (device_id, today))
        
        top_apps = cursor.fetchall()
        
        # Get recent activity timeline (last 20 entries with screenshots)
        cursor.execute("""
            SELECT 
                id, timestamp, current_window, current_process,
                status, is_idle, locked, screenshot
            FROM processed_data
            WHERE device_id = %s AND screenshot IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 20
        """, (device_id,))
        
        timeline = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Determine status
        last_seen = device['last_seen']
        if last_seen:
            time_since_seen = (datetime.now() - last_seen).total_seconds()
            if time_since_seen > 300:
                status = 'offline'
            elif device['locked']:
                status = 'locked'
            elif device['is_idle']:
                status = 'idle'
            else:
                status = 'active'
        else:
            status = 'offline'
        
        metrics = device['live_metrics'] or {}
        
        response = {
            'success': True,
            'device': {
                'device_id': device['device_id'],
                'name': device['user_name'],
                'hostname': device['hostname'],
                'os_info': device['os_info'],
                'status': status,
                'is_idle': device['is_idle'],
                'locked': device['locked'],
                'current_window': device['current_window'],
                'current_process': device['current_process'],
                'last_seen': last_seen.isoformat() if last_seen else None,
                'session_start': device['session_start'].isoformat() if device['session_start'] else None,
            },
            'metrics': {
                'screen_time_hours': metrics.get('screen_time_hours', 0),
                'active_time_hours': metrics.get('active_time_hours', 0),
                'idle_time_hours': metrics.get('idle_time_hours', 0),
                'productivity': metrics.get('productivity', 0),
                'efficiency': metrics.get('efficiency', 0),
            },
            'daily_summary': {
                'total_screen_time': float(daily_summary['total_screen_time']) if daily_summary else 0,
                'active_time': float(daily_summary['active_time']) if daily_summary else 0,
                'idle_time': float(daily_summary['idle_time']) if daily_summary else 0,
                'productivity_percentage': float(daily_summary['productivity_percentage']) if daily_summary else 0,
                'unique_apps_used': daily_summary['unique_apps_used'] if daily_summary else 0,
                'window_switches': daily_summary['window_switches'] if daily_summary else 0,
            } if daily_summary else None,
            'top_apps': [
                {
                    'app_name': app['app_name'],
                    'total_hours': round(float(app['total_seconds']) / 3600, 2),
                    'visits': app['visits']
                }
                for app in top_apps
            ],
            'timeline': [
                {
                    'id': item['id'],
                    'timestamp': item['timestamp'].isoformat(),
                    'window': item['current_window'],
                    'process': item['current_process'],
                    'status': item['status'],
                    'screenshot': item['screenshot']  # Base64
                }
                for item in timeline
            ]
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error in get_employee_detail: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# OVERALL STATS
# ============================================================================

@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get overall system statistics - MEMBERS-BASED"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # ====================================================================
        # TOTAL EMPLOYEES = Total members in members table
        # ====================================================================
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM members 
            WHERE is_active = TRUE AND status = 'active'
        """)
        total_employees = cursor.fetchone()['count']
        
        # ====================================================================
        # ACTIVE NOW = Members currently tracking (last 5 minutes)
        # Same logic as Members page
        # ====================================================================
        cursor.execute("""
            SELECT COUNT(DISTINCT LOWER(user_name)) as count
            FROM (
                SELECT user_name FROM raw_activity_log
                WHERE timestamp > NOW() - INTERVAL '5 minutes'
                UNION
                SELECT user_name FROM devices
                WHERE last_seen > NOW() - INTERVAL '5 minutes'
            ) active_tracking
            WHERE EXISTS (
                SELECT 1 FROM members m 
                WHERE LOWER(m.email) = LOWER(active_tracking.user_name)
                AND m.is_active = TRUE AND m.status = 'active'
            )
        """)
        active_now = cursor.fetchone()['count']
        
        # ====================================================================
        # Other stats - Keep existing logic (working fine)
        # ====================================================================
        
        # Today's statistics from daily_summaries
        today = datetime.now().date()
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_screen_time), 0) as total_hours,
                COALESCE(AVG(total_screen_time), 0) as avg_screen_time,
                COALESCE(AVG(productivity_percentage), 0) as avg_productivity,
                COALESCE(SUM(unique_apps_used), 0) as total_apps,
                COALESCE(SUM(screenshots_captured), 0) as total_screenshots,
                COALESCE(AVG(active_time), 0) as avg_active_time
            FROM daily_summaries
            WHERE date = %s
        """, (today,))
        
        today_stats = cursor.fetchone()
        
        # Recent activity count
        cursor.execute("""
            SELECT COUNT(*) as count FROM raw_activity_log
            WHERE timestamp > NOW() - INTERVAL '1 hour'
        """)
        recent_activity_count = cursor.fetchone()['count']
        
        # Peak hours calculation (most active hour)
        cursor.execute("""
            SELECT 
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as activity_count
            FROM raw_activity_log
            WHERE timestamp::date = %s
            GROUP BY hour
            ORDER BY activity_count DESC
            LIMIT 1
        """, (today,))
        peak_hour_result = cursor.fetchone()
        peak_hours = f"{int(peak_hour_result['hour'])}-{int(peak_hour_result['hour'])+1} PM" if peak_hour_result else "N/A"
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                # UPDATED: From members table
                'total_employees': total_employees,
                'active_now': active_now,
                'inactive_employees': total_employees - active_now,
                
                # EXISTING: Keep as is
                'today': {
                    'total_hours': round(float(today_stats['total_hours']), 2),
                    'average_screen_time': round(float(today_stats['avg_screen_time']), 2),
                    'average_active_time': round(float(today_stats['avg_active_time']), 2),
                    'average_productivity': round(float(today_stats['avg_productivity']), 1),
                    'total_apps_used': int(today_stats['total_apps']),
                    'total_screenshots': int(today_stats['total_screenshots']),
                    'peak_hours': peak_hours,
                },
                'recent_activity_count': recent_activity_count,
            }
        })
    
    except Exception as e:
        print(f"❌ Error in get_stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# RECENT ACTIVITY
# ============================================================================

@dashboard_bp.route('/activity', methods=['GET'])
def get_activity():
    """Get recent activity across all devices"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Get recent activity from processed_data (last 50 entries)
        cursor.execute("""
            SELECT 
                p.id,
                p.device_id,
                p.user_name,
                p.timestamp,
                p.current_window,
                p.current_process,
                p.status,
                p.is_idle,
                p.locked,
                d.hostname
            FROM processed_data p
            LEFT JOIN devices d ON p.device_id = d.device_id
            ORDER BY p.timestamp DESC
            LIMIT 50
        """)
        
        activities = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'activities': [
                {
                    'id': a['id'],
                    'device_id': a['device_id'],
                    'user_name': a['user_name'],
                    'hostname': a['hostname'],
                    'timestamp': a['timestamp'].isoformat(),
                    'window': a['current_window'],
                    'process': a['current_process'],
                    'status': a['status'],
                    'is_idle': a['is_idle'],
                    'locked': a['locked'],
                }
                for a in activities
            ]
        })
    
    except Exception as e:
        print(f"❌ Error in get_activity: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# ACTIVITY LOG (Paginated)
# ============================================================================

@dashboard_bp.route('/activity-log', methods=['GET'])
def get_activity_log():
    """Get paginated activity log"""
    try:
        # Query parameters
        device_id = request.args.get('device_id')
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 20))
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Build query
        if device_id:
            query = """
                SELECT * FROM processed_data
                WHERE device_id = %s
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """
            params = (device_id, limit, offset)
            
            count_query = "SELECT COUNT(*) as count FROM processed_data WHERE device_id = %s"
            count_params = (device_id,)
        else:
            query = """
                SELECT * FROM processed_data
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """
            params = (limit, offset)
            
            count_query = "SELECT COUNT(*) as count FROM processed_data"
            count_params = ()
        
        # Get total count
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['count']
        
        # Get page data
        cursor.execute(query, params)
        activities = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'activities': [
                {
                    'id': a['id'],
                    'device_id': a['device_id'],
                    'user_name': a['user_name'],
                    'timestamp': a['timestamp'].isoformat(),
                    'window': a['current_window'],
                    'process': a['current_process'],
                    'status': a['status'],
                    'has_screenshot': a['screenshot'] is not None,
                }
                for a in activities
            ],
            'pagination': {
                'total': total_count,
                'offset': offset,
                'limit': limit,
                'has_more': (offset + limit) < total_count
            }
        })
    
    except Exception as e:
        print(f"❌ Error in get_activity_log: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# SCREENSHOTS
# ============================================================================

@dashboard_bp.route('/screenshots/<device_id>', methods=['GET'])
def get_screenshots(device_id):
    """Get screenshots for a device"""
    try:
        # Optional date filter
        date_str = request.args.get('date')
        limit = int(request.args.get('limit', 50))
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        if date_str:
            # Specific date
            date_obj = datetime.fromisoformat(date_str).date()
            cursor.execute("""
                SELECT id, timestamp, current_window, current_process, screenshot
                FROM processed_data
                WHERE device_id = %s 
                AND screenshot IS NOT NULL
                AND DATE(timestamp) = %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (device_id, date_obj, limit))
        else:
            # All screenshots
            cursor.execute("""
                SELECT id, timestamp, current_window, current_process, screenshot
                FROM processed_data
                WHERE device_id = %s 
                AND screenshot IS NOT NULL
                ORDER BY timestamp DESC
                LIMIT %s
            """, (device_id, limit))
        
        screenshots = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'screenshots': [
                {
                    'id': s['id'],
                    'timestamp': s['timestamp'].isoformat(),
                    'window': s['current_window'],
                    'process': s['current_process'],
                    'screenshot': s['screenshot']  # Base64
                }
                for s in screenshots
            ],
            'total': len(screenshots)
        })
    
    except Exception as e:
        print(f"❌ Error in get_screenshots: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================================
# HEARTBEAT
# ============================================================================

@dashboard_bp.route('/device/heartbeat', methods=['POST'])
def device_heartbeat():
    """Update device heartbeat"""
    try:
        data = request.json or {}
        device_id = data.get('device_id')
        
        if not device_id:
            return jsonify({"error": "device_id required"}), 400
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE devices 
            SET last_seen = %s, status = 'online'
            WHERE device_id = %s
        """, (datetime.now(), device_id))
        
        cursor.close()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"❌ Error in device_heartbeat: {e}")
        return jsonify({"error": str(e)}), 500

print("✅ Dashboard API Blueprint created")
