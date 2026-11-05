package com.spendlens.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.util.Locale;

public class BudgetWidget extends AppWidgetProvider {

    static void updateAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, BudgetWidget.class));
        if (ids.length > 0) {
            new BudgetWidget().onUpdate(context, mgr, ids);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        SharedPreferences prefs = context.getSharedPreferences(BudgetPlugin.PREFS, Context.MODE_PRIVATE);
        float budgeted = prefs.getFloat("widget_budgeted", 0f);
        float spent = prefs.getFloat("widget_spent", 0f);
        String period = prefs.getString("widget_period", "");

        float remaining = budgeted - spent;
        int pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_budget);

            views.setTextViewText(R.id.widget_period, period.isEmpty() ? "Budget Wisely" : period);
            views.setTextViewText(R.id.widget_spent,
                String.format(Locale.getDefault(), "$%.0f spent", spent));
            views.setTextViewText(R.id.widget_budgeted,
                String.format(Locale.getDefault(), "of $%.0f", budgeted));
            views.setProgressBar(R.id.widget_progress, 100, Math.min(pct, 100), false);

            if (remaining >= 0) {
                views.setTextViewText(R.id.widget_remaining,
                    String.format(Locale.getDefault(), "$%.0f remaining", remaining));
            } else {
                views.setTextViewText(R.id.widget_remaining,
                    String.format(Locale.getDefault(), "$%.0f over budget", -remaining));
            }

            // Tap widget to open app
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pending = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pending);

            mgr.updateAppWidget(id, views);
        }
    }
}
