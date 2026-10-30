import calendar
from datetime import date, timedelta


def month_bounds(year, month):
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


def bucket_start(day, group):
    if group == 'week':
        return day - timedelta(days=day.weekday())
    if group == 'month':
        return day.replace(day=1)
    return day


def bucket_keys(start, end, group):
    keys = set()
    for offset in range((end - start).days + 1):
        keys.add(bucket_start(start + timedelta(days=offset), group))
    return sorted(keys)