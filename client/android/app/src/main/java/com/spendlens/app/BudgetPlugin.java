package com.spendlens.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "Budget")
public class BudgetPlugin extends Plugin {
    static final String PREFS = "BudgetWiselyPrefs";
    static final String WORK_TAG = "BudgetWiselySync";

    @PluginMethod
    public void setAuthToken(PluginCall call) {
        String token = call.getString("token", "");
        String apiUrl = call.getString("apiUrl", "");

        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("auth_token", token)
            .putString("api_url", apiUrl)
            .apply();

        if (token != null && !token.isEmpty()) {
            scheduleBackgroundSync(getContext());
        } else {
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_TAG);
        }

        call.resolve();
    }

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        double budgeted = call.getDouble("totalBudgeted", 0.0);
        double spent = call.getDouble("totalSpent", 0.0);
        String period = call.getString("periodLabel", "");
        String type = call.getString("type", "monthly");

        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putFloat("widget_budgeted", (float) budgeted)
            .putFloat("widget_spent", (float) spent)
            .putString("widget_period", period)
            .putString("widget_type", type)
            .apply();

        BudgetWidget.updateAll(getContext());
        call.resolve();
    }

    static void scheduleBackgroundSync(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                SyncWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_TAG,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        );
    }
}
