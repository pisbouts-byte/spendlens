package com.spendlens.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences(BudgetPlugin.PREFS, Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", "");
        String apiUrl = prefs.getString("api_url", "");

        if (token.isEmpty() || apiUrl.isEmpty()) return Result.success();

        try {
            String base = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
            HttpURLConnection conn = (HttpURLConnection) new URL(base + "/plaid/sync-all").openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(30000);

            try (OutputStream os = conn.getOutputStream()) {
                os.write("{}".getBytes("UTF-8"));
            }

            int code = conn.getResponseCode();
            conn.disconnect();

            if (code >= 200 && code < 300) {
                BudgetWidget.updateAll(getApplicationContext());
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
