package br.com.restaurantejm.financeiro;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ELMSystemBars")
public class ELMSystemBarsPlugin extends Plugin {
    private boolean light = true;

    private void apply() {
        Window window = getActivity().getWindow();
        int background = Color.parseColor(light ? "#f7f5f6" : "#180f14");
        window.setStatusBarColor(background);
        window.setNavigationBarColor(background);
        window.getDecorView().setBackgroundColor(background);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(light);
        bars.setAppearanceLightNavigationBars(light);
    }

    private JSObject state() {
        Window window = getActivity().getWindow();
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        JSObject result = new JSObject();
        result.put("lightStatusBar", bars.isAppearanceLightStatusBars());
        result.put("lightNavigationBar", bars.isAppearanceLightNavigationBars());
        return result;
    }

    @PluginMethod
    public void setTheme(PluginCall call) {
        String theme = call.getString("theme");
        if (!"light".equals(theme) && !"dark".equals(theme)) {
            call.reject("Invalid appearance");
            return;
        }
        getActivity().runOnUiThread(() -> {
            light = "light".equals(theme);
            apply();
            call.resolve(state());
        });
    }

    @PluginMethod
    public void getTheme(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(state()));
    }

    @Override
    protected void handleOnResume() {
        getActivity().runOnUiThread(this::apply);
    }
}
