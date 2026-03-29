function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function error(res, message, status = 500) {
  return res.status(status).json({ success: false, error: message });
}

function paginated(res, data, total, page, limit) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

module.exports = { success, error, paginated };
