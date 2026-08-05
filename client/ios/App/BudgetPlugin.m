#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BudgetPlugin, "Budget",
    CAP_PLUGIN_METHOD(updateWidgetData, CAPPluginReturnPromise);
)
