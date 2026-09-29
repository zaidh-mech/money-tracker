package com.zaidh.moneytracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PdfExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
