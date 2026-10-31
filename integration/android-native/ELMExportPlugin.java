package br.com.restaurantejm.financeiro;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ELMExport")
public class ELMExportPlugin extends Plugin {
    @PluginMethod
    public void saveCsv(PluginCall call) {
        String name = call.getString("name");
        String text = call.getString("text");
        if (name == null || !name.matches("[a-zA-Z0-9-]+\\.csv") || text == null) {
            call.reject("Invalid export");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/csv");
        intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "csvCreated");
    }

    @ActivityCallback
    private void csvCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject answer = new JSObject();
            answer.put("cancelled", true);
            call.resolve(answer);
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (output == null) throw new java.io.IOException("Unavailable destination");
            output.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
            JSObject answer = new JSObject();
            answer.put("cancelled", false);
            call.resolve(answer);
        } catch (Exception error) {
            call.reject("Could not save file");
        }
    }
}
