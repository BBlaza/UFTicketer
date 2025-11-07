try:
    import pymysql  # type: ignore
    pymysql.install_as_MySQLdb()
except Exception:
    # If PyMySQL isn't installed yet, Django will error at runtime; that's OK.
    pass

