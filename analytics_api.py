"""
analytics_api.py - Advanced Analytics & Reporting API
Provides detailed application usage, historical data, and PDF export functionality

New Endpoints:
  GET /api/analytics/app-usage/<device_id>          - Application usage breakdown
  GET /api/analytics/historical/<device_id>         - Historical data (days/weeks/months)
  GET /api/analytics/productivity-trends/<device_id> - Productivity over time
  GET /api/analytics/daily-summary/<device_id>      - Day-by-day summary
  GET /api/analytics/export-data/<device_id>        - Export data for PDF generation
"""
from flask import Blueprint, jsonify, request
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from collections import defaultdict
import os
import traceback
import json

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

# PostgreSQL connection
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

DB_OK = False

try:
    test_conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    test_conn.close()
    DB_OK = True
    print("✅ AnalyticsAPI connected to PostgreSQL")
except Exception as e:
    print(f"❌ AnalyticsAPI PostgreSQL connection failed: {str(e)[:140]}")
    DB_OK = False

if not DB_OK:
    print("⚠️ AnalyticsAPI: PostgreSQL not connected - running in degraded mode")


def get_db_connection():
    """Get a fresh database connection"""
    if not DB_OK or not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
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


# Load Name Mapping
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
            print(f"📁 AnalyticsAPI loaded {len(mapping)} name mappings")
    except Exception as e:
        print(f"❌ Error reading name_map.txt: {e}")
    return mapping

NAME_MAP = load_name_map()

def resolve_name(raw):
    if not raw:
        return "Unknown"
    return NAME_MAP.get(raw, raw)


def safe_iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    try:
        return dt.isoformat()
    except:
        return str(dt)


def calculate_time_ranges():
    """Calculate standard time ranges for analytics"""
    now = datetime.now()
    return {
        'today': now.replace(hour=0, minute=0, second=0, microsecond=0),
        'yesterday': now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1),
        'week_start': now - timedelta(days=now.weekday()),
        'month_start': now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        'last_7_days': now - timedelta(days=7),
        'last_30_days': now - timedelta(days=30),
        'last_90_days': now - timedelta(days=90),
    }


# ============================================================================
# APPLICATION USAGE ANALYTICS
# ============================================================================

@analytics_bp.get('/app-usage/<device_id>')
def get_app_usage(device_id):
    """
    Get detailed application usage breakdown for a device
    
    Query params:
      - period: today, yesterday, week, month, all (default: today)
      - limit: number of apps to return (default: 20)
    """
    if not check_db_connection():
        return jsonify({
            'success': False,
            'error': 'Database not connected'
        }), 503

    try:
        period = request.args.get('period', 'today')
        limit = int(request.args.get('limit', 20))
        
        time_ranges = calculate_time_ranges()
        
        # Determine date filter
        if period == 'today':
            date_filter = time_ranges['today']
        elif period == 'yesterday':
            date_filter = time_ranges['yesterday']
            end_filter = time_ranges['today']
        elif period == 'week':
            date_filter = time_ranges['last_7_days']
        elif period == 'month':
            date_filter = time_ranges['last_30_days']
        elif period == '90days':
            date_filter = time_ranges['last_90_days']
        else:  # all
            date_filter = datetime(2000, 1, 1)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 503
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all activity records for the device in the time period
        if period == 'yesterday':
            cursor.execute("""
                SELECT current_process, current_window, timestamp, is_idle, locked
                FROM processed_data
                WHERE device_id = %s 
                AND timestamp >= %s 
                AND timestamp < %s
                ORDER BY timestamp ASC
            """, (device_id, date_filter, end_filter))
        else:
            cursor.execute("""
                SELECT current_process, current_window, timestamp, is_idle, locked
                FROM processed_data
                WHERE device_id = %s 
                AND timestamp >= %s
                ORDER BY timestamp ASC
            """, (device_id, date_filter))
        
        activities = cursor.fetchall()
        
        # Process application usage
        app_usage = defaultdict(lambda: {
            'total_seconds': 0,
            'active_seconds': 0,
            'idle_seconds': 0,
            'windows': set(),
            'first_seen': None,
            'last_seen': None,
            'count': 0
        })
        
        # Calculate time spent on each app (time between consecutive records)
        for i in range(len(activities) - 1):
            current = activities[i]
            next_activity = activities[i + 1]
            
            app_name = current.get('current_process') or 'Unknown'
            window_name = current.get('current_window') or ''
            
            # Calculate time difference (in seconds)
            time_diff = (next_activity['timestamp'] - current['timestamp']).total_seconds()
            
            # Cap at 5 minutes (300 seconds) to avoid large gaps
            if time_diff > 300:
                time_diff = 5  # Default 5 seconds for tracking intervals
            
            app_usage[app_name]['total_seconds'] += time_diff
            app_usage[app_name]['count'] += 1
            
            if not current.get('is_idle') and not current.get('locked'):
                app_usage[app_name]['active_seconds'] += time_diff
            else:
                app_usage[app_name]['idle_seconds'] += time_diff
            
            if window_name:
                app_usage[app_name]['windows'].add(window_name)
            
            if not app_usage[app_name]['first_seen']:
                app_usage[app_name]['first_seen'] = current['timestamp']
            app_usage[app_name]['last_seen'] = current['timestamp']
        
        # Format results
        formatted_apps = []
        for app_name, stats in app_usage.items():
            formatted_apps.append({
                'appName': app_name,
                'totalTime': round(stats['total_seconds'], 2),
                'totalHours': round(stats['total_seconds'] / 3600, 2),
                'activeTime': round(stats['active_seconds'], 2),
                'activeHours': round(stats['active_seconds'] / 3600, 2),
                'idleTime': round(stats['idle_seconds'], 2),
                'idleHours': round(stats['idle_seconds'] / 3600, 2),
                'windowCount': len(stats['windows']),
                'windows': list(stats['windows'])[:10],  # Top 10 windows
                'firstSeen': safe_iso(stats['first_seen']),
                'lastSeen': safe_iso(stats['last_seen']),
                'usageCount': stats['count'],
                'percentage': 0  # Will calculate after sorting
            })
        
        # Sort by total time
        formatted_apps.sort(key=lambda x: x['totalTime'], reverse=True)
        
        # Calculate percentages
        total_time = sum(app['totalTime'] for app in formatted_apps)
        if total_time > 0:
            for app in formatted_apps:
                app['percentage'] = round((app['totalTime'] / total_time) * 100, 2)
        
        # Limit results
        top_apps = formatted_apps[:limit]
        other_apps_time = sum(app['totalTime'] for app in formatted_apps[limit:])
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'period': period,
            'deviceId': device_id,
            'apps': top_apps,
            'totalApps': len(formatted_apps),
            'topAppsCount': len(top_apps),
            'otherAppsTime': round(other_apps_time, 2),
            'otherAppsHours': round(other_apps_time / 3600, 2),
            'totalTrackedTime': round(total_time, 2),
            'totalTrackedHours': round(total_time / 3600, 2)
        })
    
    except Exception as e:
        print(f"❌ Error in /api/analytics/app-usage: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# HISTORICAL DATA ANALYTICS
# ============================================================================

@analytics_bp.get('/historical/<device_id>')
def get_historical_data(device_id):
    """
    Get historical data for charts and graphs
    
    Query params:
      - range: 7days, 30days, 90days, year (default: 30days)
      - granularity: hour, day, week, month (default: day)
    """
    if not check_db_connection():
        return jsonify({
            'success': False,
            'error': 'Database not connected'
        }), 503

    try:
        range_param = request.args.get('range', '30days')
        granularity = request.args.get('granularity', 'day')
        
        # Calculate date range
        now = datetime.now()
        if range_param == '7days':
            start_date = now - timedelta(days=7)
        elif range_param == '30days':
            start_date = now - timedelta(days=30)
        elif range_param == '90days':
            start_date = now - timedelta(days=90)
        elif range_param == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 503
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get device data with live metrics
        cursor.execute("""
            SELECT device_id, user_name, live_metrics, last_seen, last_activity
            FROM devices
            WHERE device_id = %s
        """, (device_id,))
        device = cursor.fetchone()
        
        if not device:
            return jsonify({
                'success': False,
                'error': 'Device not found'
            }), 404
        
        # Get all activity data in date range
        cursor.execute("""
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as activity_count,
                COUNT(CASE WHEN NOT is_idle AND NOT locked THEN 1 END) as active_count,
                COUNT(CASE WHEN is_idle OR locked THEN 1 END) as idle_count,
                COUNT(CASE WHEN screenshot IS NOT NULL THEN 1 END) as screenshot_count
            FROM processed_data
            WHERE device_id = %s AND timestamp >= %s
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) ASC
        """, (device_id, start_date))
        
        daily_data = cursor.fetchall()
        
        # Format for charts
        historical_series = []
        for day in daily_data:
            # Estimate hours based on activity count (assuming 5-second intervals)
            estimated_screen_hours = round((day['activity_count'] * 5) / 3600, 2)
            estimated_active_hours = round((day['active_count'] * 5) / 3600, 2)
            estimated_idle_hours = round((day['idle_count'] * 5) / 3600, 2)
            
            productivity = round((day['active_count'] / day['activity_count'] * 100) if day['activity_count'] > 0 else 0, 1)
            
            historical_series.append({
                'date': safe_iso(day['date']),
                'displayDate': day['date'].strftime('%Y-%m-%d'),
                'dayName': day['date'].strftime('%a'),
                'screenHours': estimated_screen_hours,
                'activeHours': estimated_active_hours,
                'idleHours': estimated_idle_hours,
                'productivity': productivity,
                'activityCount': day['activity_count'],
                'screenshotCount': day['screenshot_count']
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'deviceId': device_id,
            'userName': resolve_name(device.get('user_name')),
            'range': range_param,
            'granularity': granularity,
            'startDate': safe_iso(start_date),
            'endDate': safe_iso(now),
            'dataPoints': len(historical_series),
            'series': historical_series
        })
    
    except Exception as e:
        print(f"❌ Error in /api/analytics/historical: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# PRODUCTIVITY TRENDS
# ============================================================================

@analytics_bp.get('/productivity-trends/<device_id>')
def get_productivity_trends(device_id):
    """
    Get productivity trends over time with hour-by-hour breakdown
    """
    if not check_db_connection():
        return jsonify({
            'success': False,
            'error': 'Database not connected'
        }), 503

    try:
        range_param = request.args.get('range', '7days')
        
        now = datetime.now()
        if range_param == '7days':
            start_date = now - timedelta(days=7)
        elif range_param == '30days':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 503
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get hourly productivity breakdown
        cursor.execute("""
            SELECT 
                DATE(timestamp) as date,
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as total_activities,
                COUNT(CASE WHEN NOT is_idle AND NOT locked THEN 1 END) as active_activities,
                COUNT(CASE WHEN is_idle OR locked THEN 1 END) as idle_activities
            FROM processed_data
            WHERE device_id = %s AND timestamp >= %s
            GROUP BY DATE(timestamp), EXTRACT(HOUR FROM timestamp)
            ORDER BY DATE(timestamp) ASC, EXTRACT(HOUR FROM timestamp) ASC
        """, (device_id, start_date))
        
        hourly_data = cursor.fetchall()
        
        # Format for visualization
        trends = []
        for entry in hourly_data:
            productivity = round((entry['active_activities'] / entry['total_activities'] * 100) if entry['total_activities'] > 0 else 0, 1)
            
            trends.append({
                'date': safe_iso(entry['date']),
                'hour': int(entry['hour']),
                'displayHour': f"{int(entry['hour']):02d}:00",
                'totalActivities': entry['total_activities'],
                'activeActivities': entry['active_activities'],
                'idleActivities': entry['idle_activities'],
                'productivity': productivity,
                'estimatedMinutes': round((entry['total_activities'] * 5) / 60, 1)  # Assuming 5-sec intervals
            })
        
        # Calculate peak productivity hours
        hourly_averages = defaultdict(lambda: {'total': 0, 'count': 0})
        for entry in trends:
            hourly_averages[entry['hour']]['total'] += entry['productivity']
            hourly_averages[entry['hour']]['count'] += 1
        
        peak_hours = []
        for hour, data in hourly_averages.items():
            avg_productivity = data['total'] / data['count'] if data['count'] > 0 else 0
            peak_hours.append({
                'hour': hour,
                'displayHour': f"{hour:02d}:00",
                'averageProductivity': round(avg_productivity, 1)
            })
        
        peak_hours.sort(key=lambda x: x['averageProductivity'], reverse=True)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'deviceId': device_id,
            'range': range_param,
            'trends': trends,
            'peakHours': peak_hours[:5],  # Top 5 most productive hours
            'totalDataPoints': len(trends)
        })
    
    except Exception as e:
        print(f"❌ Error in /api/analytics/productivity-trends: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# DAILY SUMMARY
# ============================================================================

@analytics_bp.get('/daily-summary/<device_id>')
def get_daily_summary(device_id):
    """
    Get day-by-day summary for the last N days
    """
    if not check_db_connection():
        return jsonify({
            'success': False,
            'error': 'Database not connected'
        }), 503

    try:
        days = int(request.args.get('days', 30))
        
        now = datetime.now()
        start_date = now - timedelta(days=days)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 503
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get comprehensive daily summaries
        cursor.execute("""
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as total_activities,
                COUNT(CASE WHEN NOT is_idle AND NOT locked THEN 1 END) as active_count,
                COUNT(CASE WHEN is_idle THEN 1 END) as idle_count,
                COUNT(CASE WHEN locked THEN 1 END) as locked_count,
                COUNT(CASE WHEN screenshot IS NOT NULL THEN 1 END) as screenshot_count,
                COUNT(DISTINCT current_process) as unique_apps,
                MIN(timestamp) as first_activity,
                MAX(timestamp) as last_activity
            FROM processed_data
            WHERE device_id = %s AND timestamp >= %s
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) DESC
        """, (device_id, start_date))
        
        daily_summaries = cursor.fetchall()
        
        summaries = []
        for day in daily_summaries:
            # Calculate metrics
            estimated_screen_hours = round((day['total_activities'] * 5) / 3600, 2)
            estimated_active_hours = round((day['active_count'] * 5) / 3600, 2)
            estimated_idle_hours = round((day['idle_count'] * 5) / 3600, 2)
            
            productivity = round((day['active_count'] / day['total_activities'] * 100) if day['total_activities'] > 0 else 0, 1)
            
            # Calculate work duration
            work_duration = (day['last_activity'] - day['first_activity']).total_seconds() / 3600 if day['first_activity'] and day['last_activity'] else 0
            
            summaries.append({
                'date': safe_iso(day['date']),
                'displayDate': day['date'].strftime('%Y-%m-%d'),
                'dayName': day['date'].strftime('%A'),
                'screenHours': estimated_screen_hours,
                'activeHours': estimated_active_hours,
                'idleHours': estimated_idle_hours,
                'productivity': productivity,
                'uniqueApps': day['unique_apps'],
                'screenshotCount': day['screenshot_count'],
                'totalActivities': day['total_activities'],
                'workDuration': round(work_duration, 2),
                'firstActivity': safe_iso(day['first_activity']),
                'lastActivity': safe_iso(day['last_activity'])
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'deviceId': device_id,
            'days': days,
            'summaries': summaries,
            'totalDays': len(summaries)
        })
    
    except Exception as e:
        print(f"❌ Error in /api/analytics/daily-summary: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# EXPORT DATA FOR PDF
# ============================================================================

@analytics_bp.get('/export-data/<device_id>')
def get_export_data(device_id):
    """
    Get comprehensive data for PDF export
    Includes all analytics, graphs data, and summaries
    """
    if not check_db_connection():
        return jsonify({
            'success': False,
            'error': 'Database not connected'
        }), 503

    try:
        # Get all analytics data
        range_param = request.args.get('range', '30days')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 503
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get device info
        cursor.execute("""
            SELECT device_id, user_name, live_metrics, last_seen, last_activity, created_at
            FROM devices
            WHERE device_id = %s
        """, (device_id,))
        device = cursor.fetchone()
        
        if not device:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Device not found'
            }), 404
        
        live_metrics = device.get('live_metrics') or {}
        
        # Compile comprehensive export data
        export_data = {
            'deviceId': device_id,
            'userName': resolve_name(device.get('user_name')),
            'generatedAt': datetime.now().isoformat(),
            'reportRange': range_param,
            
            # Current status
            'currentStatus': {
                'screenHours': round(live_metrics.get('screen_time_hours', 0), 2),
                'activeHours': round(live_metrics.get('active_time_hours', 0), 2),
                'idleHours': round(live_metrics.get('idle_time_hours', 0), 2),
                'productivity': round(live_metrics.get('productivity', 0), 1),
                'efficiency': round(live_metrics.get('efficiency', 0), 1),
                'lastSeen': safe_iso(device.get('last_seen')),
                'lastActivity': safe_iso(device.get('last_activity')),
                'accountCreated': safe_iso(device.get('created_at'))
            }
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            **export_data
        })
    
    except Exception as e:
        print(f"❌ Error in /api/analytics/export-data: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
